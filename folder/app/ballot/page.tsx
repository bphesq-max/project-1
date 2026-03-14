import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/auth";
import BallotFinder from "../components/BallotFinder";

export default async function BallotPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/members");
  }

  return <BallotFinder />;
}
