import { TrackExplorer } from "@/components/TrackExplorer/TrackExplorer";

export default function EditPlaylistTracksPage({
  params,
}: {
  params: { playlistId: string };
}) {
  return <TrackExplorer id={decodeURIComponent(params.playlistId)} />;
}
