import { searchFiles } from "@/api/file";
import { logError } from "@/hooks/useErrorTracking";
import { mapWithConcurrency, withRetry } from "@/utils/async";
import { DEMO_FILE_EXT } from "@/utils/constants";
import { transformFile } from "@/utils/file";
import { FileMeta, Playlist } from "@/utils/types";
import { Dropbox } from "dropbox";

/**
 * Finds every playlist file in the user's Dropbox
 */
export async function searchPlaylistFiles(dbx: Dropbox): Promise<FileMeta[]> {
  return searchFiles(dbx, `.${DEMO_FILE_EXT}`, {
    file_extensions: [DEMO_FILE_EXT],
    filename_only: true,
  });
}

// Dropbox rate limits parallel downloads (429), so cap them and retry
const MAX_CONCURRENT_DOWNLOADS = 4;

/**
 * Downloads and parses playlist files. Files that are not valid playlists are
 * logged and skipped.
 */
export async function downloadPlaylists(
  dbx: Dropbox,
  files: FileMeta[],
  signal?: AbortSignal
): Promise<Playlist[]> {
  const rawFiles = await mapWithConcurrency(
    files,
    MAX_CONCURRENT_DOWNLOADS,
    (file) =>
      withRetry(
        () => dbx.filesDownload({ path: file.path_display as string }, { signal }),
        { signal }
      )
  );

  // Convert blobs to JSON
  const playlists = await Promise.all(
    rawFiles.map(async (r) => {
      const { fileBlob, ...meta } = r.result;

      try {
        if (!fileBlob) {
          throw new Error(`No file content for ${meta.path_display}`);
        }

        const data = JSON.parse(await fileBlob.text());
        // Download results are always files but come back without a ".tag"
        return { data, meta: transformFile({ ...meta, ".tag": "file" }) };
      } catch (e: Error | unknown) {
        // We hit an error parsing a file so log the error
        logError(e as Error);
        // and then return null we will filter it out later
        return null;
      }
    })
  );

  return playlists.filter(Boolean) as Playlist[];
}
