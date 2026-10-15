import { EditPlaylist } from "@/components/EditPlaylist/EditPlaylist";

export default async function EditPlaylistPage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}) {
  const { playlistId } = await params;
  return <EditPlaylist id={decodeURIComponent(playlistId)} />;
}
