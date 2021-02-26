import { useEffect, useState } from "react";
import usePlaylists from "./usePlaylists";
import { useDropbox } from "./dropboxContext";
import useUsers from "./useUsers";
import { getModifiedUsersFromEntries } from "./Explorer/fileUtils";

function usePlaylist({ playlistId }) {
  const { dbx, isAuthenticated } = useDropbox();
  const { data, isLoading, isSaving, onDeletePlaylist, onSavePlaylist } = usePlaylists({
    dbx,
    isAuthenticated
  });
  const { fetchUsers } = useUsers();
  const [users, setUsers] = useState({});
  const playlist = data.find(p => p.meta.id === playlistId);

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

  function onSave(updatedPlaylist) {
    onSavePlaylist(updatedPlaylist);
  }

  async function onDelete() {
    if (playlist) {
      return onDeletePlaylist(playlist);
    }
  }

  return {
    data: playlist,
    isLoading,
    isSaving,
    onDelete,
    onSave,
    users
  };
}

export default usePlaylist;
