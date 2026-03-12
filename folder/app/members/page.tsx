"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  CALIFORNIA_COUNTIES,
  getRegionForCounty,
  persistMemberProfile,
  type MemberProfile,
} from "../components/memberData";

const emptyProfile = {
  fullName: "",
  email: "",
  streetAddress: "",
  zipCode: "",
  city: "",
  county: "",
  notes: "",
  districtConsent: false,
  receiveEmails: false,
};

export default function MembersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [authForm, setAuthForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [form, setForm] = useState(emptyProfile);
  const [message, setMessage] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const inferredRegion = getRegionForCounty(form.county);

  useEffect(() => {
    const sessionUser = session?.user;

    if (!sessionUser?.email) {
      setForm(emptyProfile);
      return;
    }

    const currentUser = sessionUser;

    let isMounted = true;

    async function loadProfile() {
      setIsLoadingProfile(true);

      try {
        const response = await fetch("/api/members/profile");
        const data = (await response.json()) as { profile?: MemberProfile; error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Unable to load member profile.");
        }

        const profile = data.profile ?? {};
        const nextForm = {
          fullName: profile.fullName ?? currentUser.name ?? "",
          email: profile.email ?? currentUser.email ?? "",
          streetAddress: profile.streetAddress ?? "",
          zipCode: profile.zipCode ?? "",
          city: profile.city ?? "",
          county: profile.county ?? "",
          notes: profile.notes ?? "",
          districtConsent: Boolean(profile.districtConsent),
          receiveEmails: Boolean(profile.receiveEmails),
        };

        if (isMounted) {
          setForm(nextForm);
          persistMemberProfile(nextForm);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Unable to load your profile.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [session?.user]);

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthMessage("");

    if (authMode === "register") {
      if (!authForm.fullName.trim()) {
        setAuthMessage("Full name is required.");
        return;
      }

      if (authForm.password.length < 8) {
        setAuthMessage("Password must be at least 8 characters.");
        return;
      }

      if (authForm.password !== authForm.confirmPassword) {
        setAuthMessage("Passwords do not match.");
        return;
      }
    }

    setIsSubmittingAuth(true);

    try {
      if (authMode === "register") {
        const registerResponse = await fetch("/api/members/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: authForm.fullName,
            email: authForm.email,
            password: authForm.password,
          }),
        });
        const registerData = (await registerResponse.json()) as { error?: string };

        if (!registerResponse.ok) {
          throw new Error(registerData.error || "Unable to create account.");
        }
      }

      const result = await signIn("credentials", {
        email: authForm.email,
        password: authForm.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("Invalid email or password.");
      }

      setAuthMessage(
        authMode === "register"
          ? "Account created. You are now signed in."
          : "Signed in successfully."
      );
      setAuthForm({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Unable to complete sign-in.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthMessage("");
    await signIn("google", { callbackUrl: "/members" });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch("/api/members/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { profile?: MemberProfile; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to save member profile.");
      }

      const nextProfile: MemberProfile = data.profile ?? {
        ...form,
        region: getRegionForCounty(form.county),
      };
      persistMemberProfile(nextProfile);
      setForm({
        fullName: nextProfile.fullName ?? "",
        email: nextProfile.email ?? session?.user?.email ?? "",
        streetAddress: nextProfile.streetAddress ?? "",
        zipCode: nextProfile.zipCode ?? "",
        city: nextProfile.city ?? "",
        county: nextProfile.county ?? "",
        notes: nextProfile.notes ?? "",
        districtConsent: Boolean(nextProfile.districtConsent),
        receiveEmails: Boolean(nextProfile.receiveEmails),
      });
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "restore-golden-state-signup-complete",
          "true"
        );
      }
      router.push("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save your profile.");
    }
  };

  if (status === "loading") {
    return (
      <section className="member-shell">
        <div className="member-card">
          <p className="section-intro">Loading member access...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="member-shell">
      <div className="member-card">
        <div className="section-header">
          <span className="section-kicker">Free public membership</span>
          <h1 className="heading">
            {session?.user ? "Your member account" : "Create a member login"}
          </h1>
          <p className="section-intro">
            {session?.user
              ? "You are now a free member. Update your county-first profile any time to keep your regional and district matching current."
              : "Public members can sign in with Google or email, then optionally share more information to customize what they see. County is the main step. ZIP code and other profile details are optional and only help improve regional and district matching."}
          </p>
        </div>

        {!session?.user ? (
          <>
            <div className="social-buttons" aria-label="Sign in methods">
              <button
                type="button"
                className="social-button social-google"
                onClick={handleGoogleSignIn}
              >
                <span>Continue with Google</span>
                <small>Use your Google account for fast sign-in.</small>
              </button>
            </div>

            <div className="member-divider">
              <span>Or use email</span>
            </div>

            <div className="auth-switch-row">
              <button
                type="button"
                className={`dashboard-inline-button${authMode === "register" ? " is-active" : ""}`}
                onClick={() => setAuthMode("register")}
              >
                Create account
              </button>
              <button
                type="button"
                className={`dashboard-inline-button${authMode === "login" ? " is-active" : ""}`}
                onClick={() => setAuthMode("login")}
              >
                Sign in
              </button>
            </div>

            <form className="member-form" onSubmit={handleAuthSubmit}>
              {authMode === "register" ? (
                <div className="form-group">
                  <label htmlFor="member-auth-name">Full Name</label>
                  <input
                    type="text"
                    id="member-auth-name"
                    value={authForm.fullName}
                    onChange={(event) =>
                      setAuthForm((current) => ({ ...current, fullName: event.target.value }))
                    }
                    required
                  />
                </div>
              ) : null}

              <div className="form-group">
                <label htmlFor="member-auth-email">Email Address</label>
                <input
                  type="email"
                  id="member-auth-email"
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="member-auth-password">Password</label>
                <input
                  type="password"
                  id="member-auth-password"
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                />
              </div>

              {authMode === "register" ? (
                <div className="form-group">
                  <label htmlFor="member-auth-confirm">Confirm Password</label>
                  <input
                    type="password"
                    id="member-auth-confirm"
                    value={authForm.confirmPassword}
                    onChange={(event) =>
                      setAuthForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              ) : null}

              <button type="submit" className="button" disabled={isSubmittingAuth}>
                {isSubmittingAuth
                  ? "Working..."
                  : authMode === "register"
                    ? "Create account"
                    : "Sign in"}
              </button>
              {authMessage ? <p className="form-message">{authMessage}</p> : null}
            </form>
          </>
        ) : (
          <>
            <div className="member-session-bar">
              <div>
                <strong>{session.user?.name || session.user?.email}</strong>
                <p>{session.user?.email}</p>
              </div>
              <button
                type="button"
                className="dashboard-inline-button"
                onClick={() => signOut({ callbackUrl: "/members" })}
              >
                Sign out
              </button>
            </div>

            <div className="member-divider">
              <span>County-first profile information</span>
            </div>

            <form className="member-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="member-name">Full Name</label>
            <input
              type="text"
              id="member-name"
              name="member-name"
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="member-email">Email Address</label>
            <input
              type="email"
              id="member-email"
              name="member-email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="street-address">Street Address</label>
              <input
                type="text"
                id="street-address"
                name="street-address"
                placeholder="Optional"
                value={form.streetAddress}
                onChange={(event) => setForm((current) => ({ ...current, streetAddress: event.target.value }))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="zip-code">ZIP Code</label>
              <input
                type="text"
                id="zip-code"
                name="zip-code"
                inputMode="numeric"
                placeholder="Optional for more precise matching"
                value={form.zipCode}
                onChange={(event) => setForm((current) => ({ ...current, zipCode: event.target.value }))}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                placeholder="Optional"
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="county">County</label>
              <select
                id="county"
                name="county"
                value={form.county}
                onChange={(event) =>
                  setForm((current) => ({ ...current, county: event.target.value }))
                }
              >
                <option value="">Select county</option>
                {CALIFORNIA_COUNTIES.map((county) => (
                  <option key={county} value={county}>
                    {county}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {inferredRegion ? (
            <div className="privacy-note member-region-note">
              <strong>Your region</strong>
              <p>{inferredRegion}</p>
            </div>
          ) : null}

          <div className="privacy-note">
            <strong>Customize your experience</strong>
            <p>
              Start with your county, then add ZIP code, city, or notes only if
              you want more tailored candidates, events, and regional content.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="member-notes">Interests or notes</label>
            <textarea
              id="member-notes"
              name="member-notes"
              rows={4}
              placeholder="Optional details about local races, issues, or groups you want to follow."
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            ></textarea>
          </div>

          <label className="consent-row">
            <input
              type="checkbox"
              name="district-consent"
              checked={form.districtConsent}
              onChange={(event) =>
                setForm((current) => ({ ...current, districtConsent: event.target.checked }))
              }
            />
            <span>
              I understand my address details are optional and may be used only
              to determine my voting districts, assign my California region,
              and personalize the portal.
            </span>
          </label>

          <label className="consent-row">
            <input
              type="checkbox"
              name="receive-emails"
              checked={form.receiveEmails}
              onChange={(event) =>
                setForm((current) => ({ ...current, receiveEmails: event.target.checked }))
              }
            />
            <span>
              I only want to receive emails if I specifically request them.
            </span>
          </label>

          <div className="privacy-note">
            <strong>Privacy notice</strong>
            <p>
              Your personal information is confidential and used only for your
              member account, district lookup, and portal personalization. We
              will never sell it, rent it out, or give it to third parties for
              their marketing or independent use. You will only receive emails
              if you explicitly opt in.
            </p>
          </div>

          <button type="submit" className="button">
            {isLoadingProfile ? "Loading profile..." : "Save Member Profile"}
          </button>
          {message ? <p className="form-message">{message}</p> : null}
        </form>
          </>
        )}
      </div>
    </section>
  );
}
