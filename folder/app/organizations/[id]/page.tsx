import OrganizationDetailView from "../../components/OrganizationDetailView";

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrganizationDetailView id={id} />;
}
