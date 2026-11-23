import { watchFolder } from "@/api/folder";
import { dbxAtom, isAuthenticatedAtom } from "@/state/dropbox";
import { playlistAtom, syncFolderPlaylistAtom } from "@/state/playlists";
import { isPathNotFoundError } from "@/utils/error";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";

/**
 * The message to show when a folder playlist's folder cannot be listed
 */
export function getFolderSyncErrorMessage(error: unknown) {
  if (isPathNotFoundError(error)) {
    return "Couldn't find this playlist's folder. It may have been deleted, or you may no longer have access to it.";
  }

  return "Couldn't load this playlist's folder. Check your connection.";
}

/**
 * Keeps a folder playlist's tracks in sync with its folder while the
 * component is mounted. Syncs once on mount, then again each time the folder
 * changes. Does nothing for a playlist without a folder. Starts a new watch
 * when the playlist starts or stops including subfolders, because only a
 * recursive listing's cursor reports changes in subfolders.
 */
export function useFolderSync(playlistId: string) {
  const folder = useAtomValue(playlistAtom(playlistId))?.data.folder;
  const folderId = folder?.id;
  const includeSubfolders = !!folder?.includeSubfolders;
  const dbx = useAtomValue(dbxAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const syncFolderPlaylist = useSetAtom(syncFolderPlaylistAtom);
  const [isSyncing, setIsSyncing] = useState(false);
  // The error from the last sync, cleared when a sync succeeds
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!folderId || !isAuthenticated) return;

    const controller = new AbortController();

    const { signal } = controller;

    async function sync() {
      setIsSyncing(true);
      try {
        const cursor = await syncFolderPlaylist(playlistId);
        if (!signal.aborted) setError(null);
        return cursor;
      } catch (syncError) {
        // The watch tries again after a wait
        if (!signal.aborted) setError(syncError);
        throw syncError;
      } finally {
        // A newer watch may be syncing by now
        if (!signal.aborted) setIsSyncing(false);
      }
    }

    watchFolder(dbx, undefined, { onChange: sync, signal });

    return () => {
      controller.abort();
      setIsSyncing(false);
    };
  }, [
    dbx,
    folderId,
    includeSubfolders,
    isAuthenticated,
    playlistId,
    syncFolderPlaylist,
  ]);

  return {
    errorMessage: error === null ? null : getFolderSyncErrorMessage(error),
    isSyncing,
  };
}
