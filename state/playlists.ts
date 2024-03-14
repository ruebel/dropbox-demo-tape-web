import { uploadFile } from "@/api/file";
import { fetchPlaylists } from "@/api/playlists";
import { dbxAtom, isAuthenticatedAtom, rootStorageAtom } from "@/state/dropbox";
import { getUnknownUsersAtom } from "@/state/users";
import { atomWithRefresh } from "@/utils/atomWithRefresh";
import { getModifiedUsersFromEntries } from "@/utils/file";
import { Playlist } from "@/utils/types";
import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { atomFamily, loadable } from "jotai/utils";

// Playlists from server
export const dbPlaylistsAtom = atomWithRefresh(async (get) => {
  const dbx = get(dbxAtom);
  const isAuthenticated = get(isAuthenticatedAtom);

  if (!isAuthenticated || !dbx) return [];

  const playlists = await fetchPlaylists(dbx);
  return playlists;
});

export const loadableDBPlaylists = loadable(dbPlaylistsAtom);

// Keeps the local cache in sync with the server
// and keeps our local user cache up to date
export const dbPlaylistAtomEffect = atomEffect((get, set) => {
  const isAuthenticated = get(isAuthenticatedAtom);
  const playlistLoadable = get(loadableDBPlaylists);

  if (!isAuthenticated) return;

  if (playlistLoadable.state === "hasData") {
    const userIds = getModifiedUsersFromEntries(
      playlistLoadable.data.map((p) => p.meta)
    ).filter(Boolean) as string[];
    set(getUnknownUsersAtom, userIds);

    set(playlistsAtom, playlistLoadable.data);
  }
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
