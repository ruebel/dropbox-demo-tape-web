import { TrackExplorer } from "@/components/TrackExplorer/TrackExplorer";

export default async function EditPlaylistTracksPage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}) {
  const { playlistId } = await params;
  return <TrackExplorer id={decodeURIComponent(playlistId)} />;
}
