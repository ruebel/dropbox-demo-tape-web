"use client";

import { PlaylistDetails } from "@/components/PlaylistDetails/PlaylistDetails";

export default function PlaylistPage({
  params,
}: {
  params: { playlistId: string };
}) {
  return <PlaylistDetails id={decodeURIComponent(params.playlistId)} />;
}
