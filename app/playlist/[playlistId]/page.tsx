"use client";

import { use } from "react";

import { PlaylistDetails } from "@/components/PlaylistDetails/PlaylistDetails";

export default function PlaylistPage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}) {
  const { playlistId } = use(params);
  return <PlaylistDetails id={decodeURIComponent(playlistId)} />;
}
