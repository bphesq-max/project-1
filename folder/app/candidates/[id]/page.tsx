import CandidateDetailView from "../../components/CandidateDetailView";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CandidateDetailView id={id} />;
}
