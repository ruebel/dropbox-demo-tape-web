import { uploadFile } from "@/api/file";
import { getFolder, listFolderAudioFiles } from "@/api/folder";
import { downloadPlaylists, searchPlaylistFiles } from "@/api/playlists";
import { logError } from "@/hooks/useErrorTracking";
import { dbxAtom, isAuthenticatedAtom, rootStorageAtom } from "@/state/dropbox";
import { getUnknownUsersAtom } from "@/state/users";
import { atomWithRefresh } from "@/utils/atomWithRefresh";
import { getModifiedUsersFromEntries } from "@/utils/file";
import { reconcileFolderTracks } from "@/utils/folderSync";
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
      const dbx = get(dbxAtom);

      // update file to dropbox and get new meta
      const meta = await uploadFile(
        dbx,
        playlist.data,
        playlist.meta.path_lower as string
      );

      // Create new playlist shape with updated meta
      const newPlaylist = { ...playlist, meta } as Playlist;

      // Read the list after the upload, so a save to another playlist that
      // finished in the meantime is kept
      const playlists = get(playlistsAtom);
      const index = playlists.findIndex((p) => p.meta.id === playlist.meta.id);
      const newPlaylists = [...playlists];
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

type PlaylistUpdate = {
  playlistId: string;
  // Returns the changed playlist, or undefined when nothing needs saving
  update: (playlist: Playlist) => Playlist | undefined;
};

// The last save queued for each playlist. Each store gets its own map.
const playlistSaveQueuesAtom = atom(() => new Map<string, Promise<void>>());

/**
 * Updates a playlist and saves it. Saves to the same playlist run one at a
 * time, and each one applies its update to the latest saved playlist, so two
 * updates close together cannot overwrite each other.
 */
export const updatePlaylistAtom = atom(
  null,
  (get, set, { playlistId, update }: PlaylistUpdate) => {
    const queues = get(playlistSaveQueuesAtom);
    const previous = queues.get(playlistId) ?? Promise.resolve();

    const save = previous
      // A failed save must not block the saves queued after it
      .catch(() => {})
      .then(async () => {
        const playlist = get(playlistAtom(playlistId));
        if (!playlist) return;

        const updatedPlaylist = update(playlist);
        if (!updatedPlaylist) return;

        await set(playlistAtom(playlistId), updatedPlaylist);
      });

    queues.set(playlistId, save);
    return save;
  }
);

type PlaylistTrackUpdate = {
  playlistId: string;
  trackId: string;
  // Returns the changed track, or undefined when nothing needs saving
  update: (track: PlaylistTrack) => PlaylistTrack | undefined;
};

/**
 * Updates one track in a playlist and saves the playlist, in the same queue
 * as updatePlaylistAtom
 */
export const updatePlaylistTrackAtom = atom(
  null,
  (_get, set, { playlistId, trackId, update }: PlaylistTrackUpdate) =>
    set(updatePlaylistAtom, {
      playlistId,
      update: (playlist) => {
        const tracks = playlist.data.tracks;
        const index = tracks.findIndex((t) => t.id === trackId);
        if (index === -1) return undefined;

        const updatedTrack = update(tracks[index]);
        if (!updatedTrack) return undefined;

        return {
          ...playlist,
          data: {
            ...playlist.data,
            tracks: replaceItemAtIndex(tracks, index, updatedTrack),
          },
        };
      },
    })
);

/**
 * Lists a folder playlist's folder and saves its tracks when the folder
 * changed. The tracks are matched against the latest saved playlist, in the
 * same queue as updatePlaylistAtom. Returns the cursor from the listing, to
 * wait for the next change, or undefined for a playlist without a folder.
 * Throws when the folder cannot be listed. A failed save is logged and the
 * cursor is still returned, so a user who cannot write to the playlist still
 * gets the next change. Lists subfolders too when the playlist includes them.
 * When that setting changed during the listing, the files do not match it,
 * so nothing is saved: the watch for the new setting syncs again. Also saves
 * the folder's current path, which changes when the folder is renamed or
 * moved.
 */
export const syncFolderPlaylistAtom = atom(
  null,
  async (get, set, playlistId: string) => {
    const folder = get(playlistAtom(playlistId))?.data.folder;
    if (!folder) return undefined;

    const dbx = get(dbxAtom);
    const includeSubfolders = !!folder.includeSubfolders;
    // At the same time, so the extra request does not make the sync slower
    const [{ path }, { cursor, files }] = await Promise.all([
      getFolder(dbx, folder.id),
      listFolderAudioFiles(dbx, folder.id, { recursive: includeSubfolders }),
    ]);

    try {
      await set(updatePlaylistAtom, {
        playlistId,
        update: (latest) => {
          const latestFolder = latest.data.folder;
          if (!latestFolder) return undefined;
          if (!!latestFolder.includeSubfolders !== includeSubfolders) {
            return undefined;
          }

          const tracks = reconcileFolderTracks(
            latest.data.tracks,
            files,
            latestFolder.sort
          );
          const hasMoved = latestFolder.path !== path;
          if (!tracks && !hasMoved) return undefined;

          return {
            ...latest,
            data: {
              ...latest.data,
              folder: hasMoved ? { ...latestFolder, path } : latestFolder,
              tracks: tracks ?? latest.data.tracks,
            },
          };
        },
      });
    } catch (error) {
      logError(error as Error);
    }

    return cursor;
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
