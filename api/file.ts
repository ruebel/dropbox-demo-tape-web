import {
  isAudioFileOrFolder,
  isFolder,
  isImageOrFolder,
  transformFile,
} from "@/utils/file";
import { EnhancedFileMeta } from "@/utils/types";
import { Dropbox } from "dropbox";

export async function getFiles(
  dbx: Dropbox,
  folder: string | undefined = "",
  showFiles = false,
  showImages = false
) {
  // Get folder listing
  const { result } = await dbx.filesListFolder({
    path: folder,
  });

  const { cursor, entries, has_more } = result;

  const fileFilter = showFiles
    ? isAudioFileOrFolder
    : showImages
    ? isImageOrFolder
    : isFolder;

  const payload = {
    cursor,
    // @ts-expect-error - TS doesn't like the fileFilter
    data: entries.filter(fileFilter).map(transformFile) as EnhancedFileMeta[],
    hasMore: has_more,
    path: folder,
  };

  return payload;
}

/**
 * Upload a file to dropbox
 */
export async function uploadFile(dbx: Dropbox, data: any, path: string) {
  // Upload playlist to dropbox (dropbox will return new metadata)
  const { result } = await dbx.filesUpload({
    // Do not rename on conflict
    autorename: false,
    // File data to upload
    contents: JSON.stringify(data),
    // Overwrite previous version of file (if exists)
    mode: {
      ".tag": "overwrite",
    },
    // Do not notify users of change
    mute: true,
    // Path to file in dropbox
    path,
  });

  return result;
}
