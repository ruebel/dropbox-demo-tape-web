import { fileMetaHasBeenUpdated, transformFile } from "@/utils/file";
import { FileMeta, Playlist } from "@/utils/types";

/**
 * Splits the playlist files found on Dropbox into cached playlists that are
 * still current and files that need a download. Cached playlists that are no
 * longer found are dropped.
 */
export function planPlaylistSync(found: FileMeta[], cached: Playlist[]) {
  const cachedById = new Map(cached.map((playlist) => [playlist.meta.id, playlist]));
  const reused: Playlist[] = [];
  const toDownload: FileMeta[] = [];

  for (const file of found) {
    const cachedPlaylist = cachedById.get(file.id);

    if (cachedPlaylist && !fileMetaHasBeenUpdated(file, cachedPlaylist.meta)) {
      // Keep the cached contents but use the fresh metadata, so a renamed or
      // moved playlist shows its new path
      reused.push({ ...cachedPlaylist, meta: transformFile(file) });
    } else {
      toDownload.push(file);
    }
  }

  return { reused, toDownload };
}
