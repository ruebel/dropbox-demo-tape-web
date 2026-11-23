import { getThumbnails } from "@/api/file";
import { dbxAtom } from "@/state/dropbox";
import { isImage } from "@/utils/file";
import { EnhancedFileMeta } from "@/utils/types";
import { useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";

// A new revision of a file gets a new key, so its thumbnail is fetched again
function getThumbnailKey(entry: EnhancedFileMeta) {
  return `${entry.path_lower}:${entry.rev}`;
}

function hasThumbnail(entry: EnhancedFileMeta) {
  return entry.type === "file" && !!entry.path_lower && isImage(entry.name);
}

/**
 * Fetches a thumbnail for each image in `files`. Returns a map from each
 * image's path_lower to a data URL. An image is missing from the map while
 * its thumbnail loads, and when it has none. Fetches each image only once
 * while the hook is mounted, so opening a folder again shows its thumbnails
 * without new requests.
 */
export function useThumbnails(
  files: EnhancedFileMeta[],
  enabled = true
): Map<string, string> {
  const dbx = useAtomValue(dbxAtom);
  const [thumbnails, setThumbnails] = useState<ReadonlyMap<string, string>>(
    new Map()
  );
  // Keys already asked for, so a folder shown again, or a render with the
  // same files, does not fetch them again
  const requested = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return;

    const missing = files
      .filter(hasThumbnail)
      .filter((entry) => !requested.current.has(getThumbnailKey(entry)));
    if (missing.length === 0) return;

    missing.forEach((entry) => requested.current.add(getThumbnailKey(entry)));

    getThumbnails(
      dbx,
      missing.map((entry) => entry.path_lower!)
    ).then((byPath) => {
      // Kept after the user leaves the folder, so going back shows them
      setThumbnails((current) => {
        const next = new Map(current);
        for (const entry of missing) {
          const url = byPath.get(entry.path_lower!);
          if (url) next.set(getThumbnailKey(entry), url);
        }
        return next;
      });
    });
  }, [dbx, enabled, files]);

  const byPath = new Map<string, string>();
  for (const entry of files) {
    const url = thumbnails.get(getThumbnailKey(entry));
    if (url) byPath.set(entry.path_lower!, url);
  }
  return byPath;
}
