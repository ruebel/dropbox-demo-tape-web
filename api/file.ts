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

type UploadOptions = {
  // False makes the upload fail with a path/conflict error when a file is
  // already at the path, so a new file cannot replace an existing one
  overwrite?: boolean;
};

/**
 * Upload a file to dropbox
 */
export async function uploadFile(
  dbx: Dropbox,
  data: any,
  path: string,
  { overwrite = true }: UploadOptions = {}
) {
  // Upload playlist to dropbox (dropbox will return new metadata)
  const { result } = await dbx.filesUpload({
    // Do not rename on conflict
    autorename: false,
    // File data to upload
    contents: JSON.stringify(data),
    // Overwrite the previous version of the file, or only add a new file
    mode: {
      ".tag": overwrite ? "overwrite" : "add",
    },
    // Do not notify users of change
    mute: true,
    // Path to file in dropbox
    path,
  });

  return result;
}

// The most files one thumbnail batch request accepts
const THUMBNAIL_BATCH_SIZE = 25;

/**
 * Gets a small JPEG thumbnail for each image at `paths`, with one request per
 * 25 images. Returns a map from each path to a data URL that an <img> can
 * show. Leaves out images that have no thumbnail, and every image in a
 * request that failed.
 */
export async function getThumbnails(
  dbx: Dropbox,
  paths: string[]
): Promise<Map<string, string>> {
  const groups: string[][] = [];
  for (let i = 0; i < paths.length; i += THUMBNAIL_BATCH_SIZE) {
    groups.push(paths.slice(i, i + THUMBNAIL_BATCH_SIZE));
  }

  const results = await Promise.allSettled(
    groups.map((group) =>
      dbx.filesGetThumbnailBatch({
        entries: group.map((path) => ({
          format: { ".tag": "jpeg" },
          path,
          // Twice the shown size, so the thumbnail stays sharp on retina
          // screens
          size: { ".tag": "w128h128" },
        })),
      })
    )
  );

  const thumbnails = new Map<string, string>();
  results.forEach((settled, groupIndex) => {
    if (settled.status !== "fulfilled") return;

    // Entries come back in the order of the request
    settled.value.result.entries.forEach((entry, index) => {
      if (entry[".tag"] === "success") {
        thumbnails.set(
          groups[groupIndex][index],
          `data:image/jpeg;base64,${entry.thumbnail}`
        );
      }
    });
  });

  return thumbnails;
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
