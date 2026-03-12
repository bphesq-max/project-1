import NewsDetailView from "../../components/NewsDetailView";

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NewsDetailView id={id} />;
}
