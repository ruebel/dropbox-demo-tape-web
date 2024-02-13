import { ImageExplorer } from "@/components/ImageExplorer/ImageExplorer";

export default function EditPlaylistImagePage({
  params,
}: {
  params: { playlistId: string };
}) {
  return <ImageExplorer id={decodeURIComponent(params.playlistId)} />;
}
