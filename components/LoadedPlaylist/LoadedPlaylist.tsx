"use client";

import { Progress } from "@/components/Progress/Progress";
import { isStorageLoadingAtom } from "@/state/dropbox";
import { isSyncingPlaylistsAtom, playlistAtom } from "@/state/playlists";
import { Playlist } from "@/utils/types";
import { useAtomValue } from "jotai";
import { ReactNode } from "react";

type LoadedPlaylistProps = {
  // Gets the latest playlist each time it changes
  children: (playlist: Playlist) => ReactNode;
  id: string;
};

/**
 * Renders `children` once the playlist is loaded. After a reload the page
 * renders before the cache loads, so a page that copies the playlist into
 * state when it starts must render inside this, or its state starts empty.
 * Shows a progress bar while the cache or the playlists are loading, and
 * nothing when the playlist does not exist.
 */
export function LoadedPlaylist({ children, id }: LoadedPlaylistProps) {
  const playlist = useAtomValue(playlistAtom(id));
  const isStorageLoading = useAtomValue(isStorageLoadingAtom);
  const isSyncingPlaylists = useAtomValue(isSyncingPlaylistsAtom);

  if (playlist) return children(playlist);

  return isStorageLoading || isSyncingPlaylists ? <Progress /> : null;
}
