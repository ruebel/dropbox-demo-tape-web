import { EditPlaylist } from "@/components/EditPlaylist/EditPlaylist";

export default function EditPlaylistPage({
  params,
}: {
  params: { playlistId: string };
}) {
  return <EditPlaylist id={decodeURIComponent(params.playlistId)} />;
}
