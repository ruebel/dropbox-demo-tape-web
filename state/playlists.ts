import { uploadFile } from "@/api/file";
import { downloadPlaylists, searchPlaylistFiles } from "@/api/playlists";
import { logError } from "@/hooks/useErrorTracking";
import { dbxAtom, isAuthenticatedAtom, rootStorageAtom } from "@/state/dropbox";
import { getUnknownUsersAtom } from "@/state/users";
import { atomWithRefresh } from "@/utils/atomWithRefresh";
import { getModifiedUsersFromEntries } from "@/utils/file";
import { replaceItemAtIndex } from "@/utils/list";
import { loadable } from "@/utils/loadable";
import { planPlaylistSync } from "@/utils/playlistSync";
import { Playlist, PlaylistSortType, PlaylistTrack } from "@/utils/types";
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

// The error from the last sync whose downloads failed, cleared when the next
// sync starts
export const playlistSyncErrorAtom = atom<unknown>(null);

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
  set(playlistSyncErrorAtom, null);

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
      if (controller.signal.aborted) return;

      logError(error);
      set(playlistSyncErrorAtom, error);
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

type PlaylistTrackUpdate = {
  playlistId: string;
  trackId: string;
  // Returns the changed track, or undefined when nothing needs saving
  update: (track: PlaylistTrack) => PlaylistTrack | undefined;
};

// The last save queued for each playlist. Each store gets its own map.
const trackSaveQueuesAtom = atom(() => new Map<string, Promise<void>>());

/**
 * Updates one track in a playlist and saves the playlist. Saves to the same
 * playlist run one at a time, and each one applies its update to the latest
 * saved playlist, so two updates close together cannot overwrite each other.
 */
export const updatePlaylistTrackAtom = atom(
  null,
  (get, set, { playlistId, trackId, update }: PlaylistTrackUpdate) => {
    const queues = get(trackSaveQueuesAtom);
    const previous = queues.get(playlistId) ?? Promise.resolve();

    const save = previous
      // A failed save must not block the saves queued after it
      .catch(() => {})
      .then(async () => {
        const playlist = get(playlistAtom(playlistId));
        const tracks = playlist?.data.tracks || [];
        const index = tracks.findIndex((t) => t.id === trackId);
        if (!playlist || index === -1) return;

        const updatedTrack = update(tracks[index]);
        if (!updatedTrack) return;

        await set(playlistAtom(playlistId), {
          ...playlist,
          data: {
            ...playlist.data,
            tracks: replaceItemAtIndex(tracks, index, updatedTrack),
          },
        });
      });

    queues.set(playlistId, save);
    return save;
  }
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
