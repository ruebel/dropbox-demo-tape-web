import { ImageExplorer } from "@/components/ImageExplorer/ImageExplorer";

export default async function EditPlaylistImagePage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}) {
  const { playlistId } = await params;
  return <ImageExplorer id={decodeURIComponent(playlistId)} />;
}
