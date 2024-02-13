import { dbxAtom } from "@/state/dropbox";
import { playlistsAtom } from "@/state/playlists";
import { Playlist } from "@/utils/types";
import { useAtom, useAtomValue } from "jotai";
import { useState } from "react";

export function useDeletePlaylist() {
  const [isLoading, setIsLoading] = useState(false);
  const dbx = useAtomValue(dbxAtom);
  const [playlists, saveLocalPlaylists] = useAtom(playlistsAtom);

  async function onDeletePlaylist(playlist: Playlist) {
    setIsLoading(true);

    // delete file on dropbox
    await dbx.filesDelete({ path: playlist.meta.path_lower as string });

    // delete playlist locally
    const updatedPlaylists = playlists.filter(
      (p) => p.meta.id !== playlist.meta.id
    );

    await saveLocalPlaylists(updatedPlaylists);

    setIsLoading(false);
  }

  return { isLoading, onDeletePlaylist };
}
