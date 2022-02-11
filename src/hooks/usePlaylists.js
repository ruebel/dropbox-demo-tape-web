import { useEffect, useState } from "react";

import { useCache } from "./cacheContext";
import { useDropbox } from "./dropboxContext";
import { logError } from "./useErrorTracking";
import { useUsers } from "./useUsers";
import {
  getModifiedBy,
  getModifiedUsersFromEntries,
  getPlaylistId,
  updateItemInListById,
  uploadFile,
} from "../utils";

export function usePlaylists({ forceRefresh, playlistId }) {
  const cache = useCache();
  const { dbx, isAuthenticated } = useDropbox();
  const { fetchUsers } = useUsers();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState({});

  // Get from cache so all versions of this hook are n-sync
  const playlists = cache.getValue("playlists") || [];
  const playlist =
    playlistId && Array.isArray(playlists)
      ? playlists.find((p) => p.meta.id === playlistId)
      : null;

  useEffect(() => {
    if (
      isAuthenticated &&
      dbx &&
      !isLoading &&
      (forceRefresh || playlists.length === 0)
    ) {
      setIsLoading(true);

      async function fetchPlaylists() {
        // Search for playlist files
        const res = await dbx.filesSearch({
          path: "",
          query: ".mix",
        });

        // Downloaad all files
        const results = await Promise.all(
          res?.result?.matches.map((m) =>
            dbx.filesDownload({
              path: m.metadata.path_display,
            })
          )
        );

        // Convert blobs to JSON
        const rawPlaylists = await Promise.all(
          results.map((r) => {
            return new Promise((resolve) => {
              const fr = new FileReader();

              fr.addEventListener("loadend", (e) => {
                try {
                  const text = e.srcElement.result;
                  const data = JSON.parse(text);
                  resolve({ data, meta: r.result });
                } catch (e) {
                  // We hit an error parsing a file so log the error
                  logError(e);
                  // and then return null we will filter it out later
                  resolve(null);
                }
              });

              fr.readAsText(r.result.fileBlob);
            });
          })
        );

        // Get all user ids of users who have modified listed files
        const userIds = getModifiedUsersFromEntries(results);
        const users = await fetchUsers(userIds);

        const playlistsWithUsers = (rawPlaylists || [])
          .filter(Boolean)
          .map((p) => ({
            ...p,
            meta: {
              ...p.meta,
              user: users[getModifiedBy(p.meta)],
            },
          }));

        // Save in cache and in state
        savePlaylists(playlistsWithUsers);
        setIsLoading(false);
      }

      fetchPlaylists();
    }
    // eslint-disable-next-line
  }, [dbx, isAuthenticated]);

  useEffect(() => {
    async function getUsers(ids) {
      const users = await fetchUsers(ids);
      setUsers(users);
    }

    if (playlist?.data?.tracks) {
      // Get all user ids of users who have modified listed files
      const userIds = getModifiedUsersFromEntries(playlist.data.tracks);
      if (userIds.length > 0) {
        getUsers(userIds);
      }
    }
    // eslint-disable-next-line
  }, [playlist]);

  async function onCreatePlaylist(path, playlist) {
    // update file on dropbox
    const meta = await uploadFile(dbx, playlist, path);

    // save playlist locally
    savePlaylistLocally(
      {
        data: playlist,
        meta,
      },
      true
    );

    return meta.id;
  }

  async function onDeletePlaylist(playlist) {
    if (!playlist) return;

    setIsLoading(true);
    // delete file on dropbox
    await dbx.filesDelete({ path: playlist.meta.path_lower });

    // delete playlist locally
    const updatedPlaylists = playlists.filter(
      (p) => p.meta.id !== playlist.meta.id
    );
    cache.setValue("playlists", updatedPlaylists);
    // setPlaylists(updatedPlaylists);
    setIsLoading(false);
  }

  async function onSavePlaylist(playlist) {
    setIsSaving(true);
    // Optimistic local save
    savePlaylistLocally(playlist);

    // update file on dropbox
    const meta = await uploadFile(dbx, playlist.data, playlist.meta.path_lower);

    // update meta locally
    savePlaylistLocally({
      ...playlist,
      meta,
    });
    setIsSaving(false);
  }

  function savePlaylists(updatedPlaylists = []) {
    // sort by title
    const sortedPlaylists = updatedPlaylists.sort((a, b) =>
      a.data.title.localeCompare(b.data.title)
    );

    // Save in state and to cache
    cache.setValue("playlists", sortedPlaylists);
  }

  function savePlaylistLocally(playlist, isNew = false) {
    const updatedList = isNew
      ? [...playlists, playlist]
      : updateItemInListById(
          playlists,
          getPlaylistId(playlist),
          getPlaylistId,
          playlist
        );

    savePlaylists(updatedList);
  }

  return {
    isLoading,
    isSaving,
    onCreatePlaylist,
    onDeletePlaylist,
    onSavePlaylist,
    playlist,
    playlists,
    users,
  };
}
