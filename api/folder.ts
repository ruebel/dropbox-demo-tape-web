import { wait } from "@/utils/async";
import { isCursorResetError } from "@/utils/error";
import { isAudioFile } from "@/utils/file";
import { FileMeta } from "@/utils/types";
import { Dropbox } from "dropbox";

/**
 * Gets the id and display path of the folder at `path`. Throws when the path
 * is not a folder.
 */
export async function getFolder(dbx: Dropbox, path: string) {
  const { result } = await dbx.filesGetMetadata({ path });

  if (result[".tag"] !== "folder") {
    throw new Error(`Not a folder: ${path}`);
  }

  return { id: result.id, path: result.path_display ?? path };
}

export type FolderAudioFiles = {
  // Pass to a long poll to wait for the next change in the folder
  cursor: string;
  files: FileMeta[];
};

type ListFolderAudioFilesOptions = {
  // Also list the audio files in subfolders, at any depth. The cursor then
  // reports changes in subfolders too.
  recursive?: boolean;
};

/**
 * Lists the audio files in a folder, reading every page. Files in subfolders
 * are included only when `recursive` is true. `folderId` can be a folder id
 * ("id:...") or a path.
 */
export async function listFolderAudioFiles(
  dbx: Dropbox,
  folderId: string,
  { recursive = false }: ListFolderAudioFilesOptions = {}
): Promise<FolderAudioFiles> {
  let { result } = await dbx.filesListFolder({ path: folderId, recursive });
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

// The first wait after an error. Each error after that doubles the wait, up
// to the most.
const FIRST_ERROR_DELAY_MS = 5_000;
const MAX_ERROR_DELAY_MS = 60_000;

type WatchFolderOptions = {
  // Called when the folder changed. Returns the cursor to wait on next, or
  // undefined to stop watching.
  onChange: () => Promise<string | undefined>;
  // Called with each error, before the watch waits and tries again
  onError?: (error: unknown) => void;
  // Stops the watch
  signal: AbortSignal;
};

/**
 * Waits for changes in a folder with Dropbox long polling, and calls
 * `onChange` after each change until the signal aborts. With no cursor,
 * calls `onChange` first to get one. Waits the time Dropbox asks for before
 * the next poll. After an error, waits and tries the same step again: the
 * poll, or `onChange` when that failed. When Dropbox no longer accepts the
 * cursor, calls `onChange` to get a new one.
 */
export async function watchFolder(
  dbx: Dropbox,
  cursor: string | undefined,
  { onChange, onError, signal }: WatchFolderOptions
) {
  let current = cursor;
  let hasChanges = cursor === undefined;
  let errorDelay = FIRST_ERROR_DELAY_MS;

  while (!signal.aborted) {
    try {
      let backoffMs = 0;

      if (!hasChanges && current) {
        const { result } = await dbx.filesListFolderLongpoll(
          { cursor: current },
          { signal }
        );
        hasChanges = result.changes;
        backoffMs = (result.backoff ?? 0) * 1000;
      }

      if (hasChanges) {
        current = await onChange();
        hasChanges = false;
        if (!current) return;
      }

      errorDelay = FIRST_ERROR_DELAY_MS;
      if (backoffMs > 0) await wait(backoffMs, signal);
    } catch (error) {
      if (signal.aborted) return;

      onError?.(error);
      if (isCursorResetError(error)) hasChanges = true;

      try {
        await wait(errorDelay, signal);
      } catch {
        return;
      }
      errorDelay = Math.min(errorDelay * 2, MAX_ERROR_DELAY_MS);
    }
  }
}
