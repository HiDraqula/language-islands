import { IslandWorkspace } from "@/components/island-workspace";

export default async function IslandPage({ params, searchParams }: { params: Promise<{ islandId: string }>; searchParams: Promise<{ title?: string; description?: string }> }) {
  const { islandId } = await params;
  const query = await searchParams;
  return <IslandWorkspace islandId={islandId} islandTitle={query.title} islandDescription={query.description} />;
}
