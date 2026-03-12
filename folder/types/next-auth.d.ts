import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: "member" | "admin";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "member" | "admin";
  }
}
