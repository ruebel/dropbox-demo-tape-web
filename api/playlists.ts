import { logError } from "@/hooks/useErrorTracking";
import { mapWithConcurrency, withRetry } from "@/utils/async";
import { DEMO_FILE_EXT } from "@/utils/constants";
import { transformFile } from "@/utils/file";
import { FileMeta, Playlist } from "@/utils/types";
import { Dropbox } from "dropbox";

export async function fetchPlaylists(dbx: Dropbox): Promise<Playlist[]> {
  const filesMeta = await fileSearch(dbx, `.${DEMO_FILE_EXT}`);

  if (!filesMeta?.result?.matches) return [];

  const playlists = await getPlaylistFiles(
    dbx,
    filesMeta?.result?.matches.map(
      (match) => match.metadata.path_display as string
    )
  );

  return playlists;
}

function fileSearch(dbx: Dropbox, query: string) {
  return dbx.filesSearch({
    path: "",
    query,
  });
}

// Dropbox rate limits parallel downloads (429), so cap them and retry
const MAX_CONCURRENT_DOWNLOADS = 4;

async function getPlaylistFiles(dbx: Dropbox, paths: string[]) {
  const rawFiles = await mapWithConcurrency(
    paths,
    MAX_CONCURRENT_DOWNLOADS,
    (path) => withRetry(() => dbx.filesDownload({ path }))
  );

  // Convert blobs to JSON
  const playlists = await Promise.all(
    rawFiles.map((r) => {
      return new Promise((resolve) => {
        const fr = new FileReader();

        fr.addEventListener(
          "load",
          () => {
            try {
              const text = fr.result as string;
              const data = JSON.parse(text);

              resolve({ data, meta: transformFile(r.result as FileMeta) });
            } catch (e: Error | unknown) {
              // We hit an error parsing a file so log the error
              logError(e as Error);
              // and then return null we will filter it out later
              resolve(null);
            }
          },
          false
        );

        // @ts-expect-error .fileBlob is on the Dropbox result but not in the type
        fr.readAsText(r.result.fileBlob);
      });
    })
  );

  return playlists.filter(Boolean) as Playlist[];
}
