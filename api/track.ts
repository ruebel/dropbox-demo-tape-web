import { isPathNotFoundError } from "@/utils/error";
import { PlaylistTrack } from "@/utils/types";
import { Dropbox } from "dropbox";

/**
 * Gets a temporary link to play a track. When the file is no longer at the
 * saved path, tries again by file id, because Dropbox keeps a file's id when
 * the file is moved or renamed. The returned metadata has the current path.
 */
export async function getTrackLink(dbx: Dropbox, track: PlaylistTrack) {
  try {
    const { result } = await dbx.filesGetTemporaryLink({
      path: track.path_lower as string,
    });
    return result;
  } catch (error) {
    if (!isPathNotFoundError(error) || !track.id) {
      throw error;
    }

    // File ids look like "id:a4ayc_80_OEAAAAAAAAAXw" and work as a path
    const { result } = await dbx.filesGetTemporaryLink({ path: track.id });
    return result;
  }
}
