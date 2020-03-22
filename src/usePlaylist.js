import usePlaylists from "./usePlaylists";
import { useDropbox } from "./dropboxContext";

function usePlaylist({ playlistId }) {
  const { dbx, isAuthenticated } = useDropbox();
  const { data, isLoading, onDeletePlaylist, onSavePlaylist } = usePlaylists({
    dbx,
    isAuthenticated
  });
  const playlist = data.find(p => p.meta.id === playlistId);

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
    onDelete,
    onSave
  };
}

export default usePlaylist;
