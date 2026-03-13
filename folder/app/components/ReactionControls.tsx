"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import type { PortalContentKind } from "@/lib/portalContent";
import type { ReactionValue } from "@/lib/reactions";

const options: Array<{ value: ReactionValue; label: string; icon: string }> = [
  { value: "heart", label: "Heart", icon: "❤️" },
  { value: "thumbs_up", label: "Thumbs up", icon: "👍" },
  { value: "thumbs_down", label: "Thumbs down", icon: "👎" },
];

export default function ReactionControls({
  kind,
  id,
}: {
  kind: PortalContentKind;
  id: string;
}) {
  const { data: session, status } = useSession();
  const [reaction, setReaction] = useState<ReactionValue | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) {
      setReaction(null);
      return;
    }

    let isMounted = true;

    fetch(`/api/reactions/${kind}/${id}`, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { reaction?: ReactionValue | null };
        if (isMounted) {
          setReaction(data.reaction ?? null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReaction(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, kind, session?.user?.email, status]);

  const handleReact = async (nextReaction: ReactionValue) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/reactions/${kind}/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reaction: nextReaction }),
      });
      const data = (await response.json()) as {
        reaction?: ReactionValue | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Unable to save reaction.");
      }

      setReaction(data.reaction ?? null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="reaction-box">
      {session?.user ? (
        <>
          <div className="reaction-grid">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`reaction-button${reaction === option.value ? " is-active" : ""}`}
                onClick={() => handleReact(option.value)}
                disabled={isSaving}
                aria-label={option.label}
                title={option.label}
              >
                <span className="reaction-emoji" aria-hidden="true">
                  {option.icon}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : status === "loading" ? (
        <p className="reaction-note">Checking member access...</p>
      ) : (
        <p className="reaction-note">
          <Link href="/members" className="dashboard-inline-button">
            Sign in as a free member
          </Link>{" "}
          to react.
        </p>
      )}
    </div>
  );
}
