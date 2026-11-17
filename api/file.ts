import {
  isAudioFileOrFolder,
  isFolder,
  isImageOrFolder,
  transformFile,
} from "@/utils/file";
import { EnhancedFileMeta, FileMeta } from "@/utils/types";
import { Dropbox, files } from "dropbox";

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

// The largest page size search allows
const SEARCH_PAGE_SIZE = 1000;

/**
 * Searches the user's Dropbox and reads every page of results. Returns files
 * only (not folders whose name happens to match), and each file only once
 * because pages can repeat a match.
 */
export async function searchFiles(
  dbx: Dropbox,
  query: string,
  options: Omit<files.SearchOptions, "max_results"> = {}
): Promise<FileMeta[]> {
  let { result } = await dbx.filesSearchV2({
    query,
    options: { ...options, max_results: SEARCH_PAGE_SIZE },
  });
  const matches = [...result.matches];

  while (result.has_more && result.cursor) {
    ({ result } = await dbx.filesSearchContinueV2({ cursor: result.cursor }));
    matches.push(...result.matches);
  }

  const found = new Map<string, FileMeta>();
  for (const { metadata } of matches) {
    if (metadata[".tag"] !== "metadata") continue;

    const file = metadata.metadata;
    if (file[".tag"] === "file" && !found.has(file.id)) {
      found.set(file.id, file as FileMeta);
    }
  }

  return [...found.values()];
}
