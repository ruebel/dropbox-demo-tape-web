import { isAudioFile } from "@/utils/file";
import { FileMeta } from "@/utils/types";
import { Dropbox } from "dropbox";

export type FolderAudioFiles = {
  // Pass to a long poll to wait for the next change in the folder
  cursor: string;
  files: FileMeta[];
};

/**
 * Lists the audio files directly in a folder, reading every page. Subfolders
 * and the files in them are not included. `folderId` can be a folder id
 * ("id:...") or a path.
 */
export async function listFolderAudioFiles(
  dbx: Dropbox,
  folderId: string
): Promise<FolderAudioFiles> {
  let { result } = await dbx.filesListFolder({ path: folderId });
  const entries = [...result.entries];

  while (result.has_more) {
    ({ result } = await dbx.filesListFolderContinue({ cursor: result.cursor }));
    entries.push(...result.entries);
  }

  const files = entries.filter(
    (entry) => entry[".tag"] === "file" && isAudioFile(entry.name)
  ) as FileMeta[];

  // The cursor from the last page, so the long poll sees changes made after
  // this listing
  return { cursor: result.cursor, files };
}
