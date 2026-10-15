import { uploadFile } from "@/api/file";
import { downloadPlaylists, searchPlaylistFiles } from "@/api/playlists";
import { logError } from "@/hooks/useErrorTracking";
import { dbxAtom, isAuthenticatedAtom, rootStorageAtom } from "@/state/dropbox";
import { getUnknownUsersAtom } from "@/state/users";
import { atomWithRefresh } from "@/utils/atomWithRefresh";
import { getModifiedUsersFromEntries } from "@/utils/file";
import { loadable } from "@/utils/loadable";
import { planPlaylistSync } from "@/utils/playlistSync";
import { Playlist, PlaylistSortType } from "@/utils/types";
import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { atomFamily } from "jotai-family";

// Playlist files found on the server
export const dbPlaylistFilesAtom = atomWithRefresh(async (get) => {
  const dbx = get(dbxAtom);
  const isAuthenticated = get(isAuthenticatedAtom);

  if (!isAuthenticated || !dbx) return [];

  return searchPlaylistFiles(dbx);
});

export const loadableDBPlaylistFiles = loadable(dbPlaylistFilesAtom);

// True while changed playlists are downloading
export const isSyncingPlaylistsAtom = atom(false);

// Keeps the local cache in sync with the server by downloading only the
// playlists that changed since they were cached, and keeps our local user
// cache up to date
export const dbPlaylistAtomEffect = atomEffect((get, set) => {
  const isAuthenticated = get(isAuthenticatedAtom);
  const filesLoadable = get(loadableDBPlaylistFiles);

  if (!isAuthenticated || filesLoadable.state !== "hasData") return;

  // Peek so that writing the cache does not run this effect again
  const dbx = get.peek(dbxAtom);
  const { reused, toDownload } = planPlaylistSync(
    filesLoadable.data,
    get.peek(playlistsAtom)
  );
  const controller = new AbortController();

  set(isSyncingPlaylistsAtom, true);

  downloadPlaylists(dbx, toDownload, controller.signal)
    .then((downloaded) => {
      if (controller.signal.aborted) return;

      const playlists = [...reused, ...downloaded];
      const userIds = getModifiedUsersFromEntries(
        playlists.map((p) => p.meta)
      ).filter(Boolean) as string[];
      set(getUnknownUsersAtom, userIds);

      set(playlistsAtom, playlists);
    })
    .catch((error) => {
      // Keep the cache as it is when a download fails
      if (!controller.signal.aborted) logError(error);
    })
    .finally(() => {
      if (!controller.signal.aborted) set(isSyncingPlaylistsAtom, false);
    });

  // Runs when the search results change or the effect unmounts, so a stale
  // sync never overwrites a newer one
  return () => {
    controller.abort();
    set(isSyncingPlaylistsAtom, false);
  };
});

// Cached locally, but refreshed from server
export const playlistsAtom = atom(
  (get) => get(rootStorageAtom)?.playlists || [],
  (get, set, playlists: Playlist[]) => {
    const root = get(rootStorageAtom);
    set(rootStorageAtom, { ...root, playlists });
  }
);

/**
 * Gets a single playlist by id
 */
export const playlistAtom = atomFamily((id: string | null) =>
  atom(
    (get) =>
      id ? get(playlistsAtom).find((p) => p.meta.id === id) || null : null,
    async (get, set, playlist: Playlist) => {
      const playlists = get(playlistsAtom);
      const dbx = get(dbxAtom);
      const index = playlists.findIndex((p) => p.meta.id === playlist.meta.id);

      // update file to dropbox and get new meta
      const meta = await uploadFile(
        dbx,
        playlist.data,
        playlist.meta.path_lower as string
      );

      // Create new playlist shape with updated meta
      const newPlaylist = { ...playlist, meta } as Playlist;

      let newPlaylists = [...playlists];
      if (index > -1) {
        // Updating an existing playlis
        newPlaylists[index] = newPlaylist;
      } else {
        // Creating a new playlist
        newPlaylists.push(newPlaylist);
      }

      set(playlistsAtom, newPlaylists);
    }
  )
);

/**
 * Selector to get all of the artists from the playlists
 */
export const artistsAtom = atom((get) => {
  const playlists = get(playlistsAtom);
  return Array.from(new Set(playlists.map((p) => p.data.artist)))
    .filter(Boolean)
    .sort();
});

export const sortPlaylistsAtom = atom<PlaylistSortType>("modified");
