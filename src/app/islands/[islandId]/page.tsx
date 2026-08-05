import { IslandWorkspace } from "@/components/island-workspace";

export default async function IslandPage({ params }: { params: Promise<{ islandId: string }> }) {
  const { islandId } = await params;
  return <IslandWorkspace islandId={islandId} />;
}
