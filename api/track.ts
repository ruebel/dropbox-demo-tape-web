import { searchFiles } from "@/api/file";
import { isPathNotFoundError } from "@/utils/error";
import { getExtension, removeExtension } from "@/utils/file";
import { FileMeta, PlaylistTrack } from "@/utils/types";
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

/**
 * Finds files with exactly this name (ignoring case) anywhere in the user's
 * Dropbox, to replace a track whose file is gone. Files in `sharedFolderId`
 * come first, because people who share the playlist can open them. Within
 * each group the newest file comes first.
 */
export async function findFilesByName(
  dbx: Dropbox,
  name: string,
  sharedFolderId?: string
) {
  const hasExtension = name.includes(".");
  const query = hasExtension ? removeExtension(name) : name;
  const found = await searchFiles(dbx, query, {
    filename_only: true,
    ...(hasExtension && { file_extensions: [getExtension(name)] }),
  });

  // Search also matches names that only contain the query
  const lowerName = name.toLowerCase();
  const matches = found.filter((file) => file.name.toLowerCase() === lowerName);

  const isShared = (file: FileMeta) =>
    !!sharedFolderId &&
    file.sharing_info?.parent_shared_folder_id === sharedFolderId;

  return matches.sort(
    (a, b) =>
      Number(isShared(b)) - Number(isShared(a)) ||
      b.server_modified.localeCompare(a.server_modified)
  );
}
