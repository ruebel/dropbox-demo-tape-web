import { useEffect, useState } from "react";

import { useCache } from "./cacheContext";
import { useDropbox } from "./dropboxContext";
import useUsers from "./useUsers";
import { getPlaylistId, updateItemInListById } from "./utils";
import { uploadFile } from "./dropxboxUtils";
import {
  getModifiedBy,
  getModifiedUsersFromEntries
} from "./Explorer/fileUtils";

function usePlaylists({ forceRefresh }) {
  const cache = useCache();
  const { dbx, isAuthenticated } = useDropbox();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [playlists, setPlaylists] = useState(cache.getValue("playlists") || []);
  const { fetchUsers } = useUsers();

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
          query: ".mix"
        });

        // Downloaad all files
        const results = await Promise.all(
          res?.result?.matches.map(m =>
            dbx.filesDownload({
              path: m.metadata.path_display
            })
          )
        );

        // Convert blobs to JSON
        const rawPlaylists = await Promise.all(
          results.map(r => {
            return new Promise(resolve => {
              const fr = new FileReader();

              fr.addEventListener("loadend", e => {
                const text = e.srcElement.result;
                const data = JSON.parse(text);
                resolve({ data, meta: r.result });
              });

              fr.readAsText(r.result.fileBlob);
            });
          })
        );

        // Get all user ids of users who have modified listed files
        const userIds = getModifiedUsersFromEntries(results);
        const users = await fetchUsers(userIds);

        const playlistsWithUsers = (rawPlaylists || []).map(p => ({
          ...p,
          meta: {
            ...p.meta,
            user: users[getModifiedBy(p.meta)]
          }
        }));

        // Save in cache and in state
        savePlaylists(playlistsWithUsers);
        setIsLoading(false);
      }

      fetchPlaylists();
    }
    // eslint-disable-next-line
  }, [dbx, isAuthenticated]);

  async function onCreatePlaylist(path, playlist) {
    // update file on dropbox
    const meta = await uploadFile(dbx, playlist, path);

    // save playlist locally
    savePlaylistLocally(
      {
        data: playlist,
        meta
      },
      true
    );

    return meta.id;
  }

  async function onDeletePlaylist(playlist) {
    setIsLoading(true);
    // delete file on dropbox
    await dbx.filesDelete({ path: playlist.meta.path_lower });

    // delete playlist locally
    const updatedPlaylists = playlists.filter(
      p => p.meta.id !== playlist.meta.id
    );
    setPlaylists(updatedPlaylists);
    cache.setValue("playlists", updatedPlaylists);
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
      meta
    });
    setIsSaving(false);
  }

  function savePlaylists(updatedPlaylists = []) {
    // sort by title
    const sortedPlaylists = updatedPlaylists.sort((a, b) =>
      a.data.title.localeCompare(b.data.title)
    );

    // Save in state and to cache
    setPlaylists(sortedPlaylists);
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
    data: playlists,
    isLoading,
    isSaving,
    onCreatePlaylist,
    onDeletePlaylist,
    onSavePlaylist
  };
}

export default usePlaylists;
