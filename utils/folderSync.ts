import { fileMetaHasBeenUpdated, transformFile } from "@/utils/file";
import { FileMeta, FolderSort, PlaylistTrack } from "@/utils/types";

// A fixed locale, so every user sorts the same names in the same order and
// their syncs do not save different orders over each other. Numeric, so
// "Track 2" comes before "Track 10".
const fileNameCollator = new Intl.Collator("en", { numeric: true });

/**
 * Compares two file names in natural order
 */
export function compareFileNames(a: string, b: string) {
  return fileNameCollator.compare(a, b);
}

type PathItem = { name: string; path_lower?: string };

/**
 * The lowercase path of a file, to match and sort files by. Dropbox leaves
 * out the path only for a file that is not mounted, which a folder listing
 * does not return, so the name is only a fallback for the type.
 */
function getPathKey(item: PathItem) {
  return item.path_lower ?? item.name.toLowerCase();
}

// Every file in a folder playlist shares the folder's path, so path order is
// file name order for a flat folder, and keeps each subfolder's files together
function byPath(a: PathItem, b: PathItem) {
  return compareFileNames(getPathKey(a), getPathKey(b));
}

/**
 * Returns a copy of the tracks in path order
 */
export function sortTracksByPath(tracks: PlaylistTrack[]) {
  return [...tracks].sort(byPath);
}

/**
 * Returns the saved track for a file in the folder. A track with the same id
 * gets fresh metadata when the file changed and keeps its duration. A track
 * that only matched by path is a different file (deleted and uploaded
 * again), so it starts over as a new track in the same place.
 */
function matchTrack(track: PlaylistTrack, file: FileMeta): PlaylistTrack {
  if (file.id !== track.id) {
    return transformFile(file);
  }

  const hasChanged =
    fileMetaHasBeenUpdated(file, track) ||
    // A renamed file keeps its rev but has a new path
    file.path_lower !== track.path_lower;

  if (!hasChanged) return track;

  return {
    ...track,
    ...transformFile(file),
    // The file changed, so an error about the old file no longer applies
    error: undefined,
    errorCode: undefined,
  };
}

/**
 * Updates a folder playlist's tracks to match the audio files in its folder.
 * Each saved track matches a file by id, or else by path (ignoring case).
 * Matching by path, not name, keeps apart files with the same name in
 * different subfolders. Tracks with no file are removed. Files with no track
 * are added: in path order when `sort` is "name", and at the end in path
 * order when `sort` is "custom". Returns undefined when the tracks do not
 * change.
 */
export function reconcileFolderTracks(
  tracks: PlaylistTrack[],
  files: FileMeta[],
  sort: FolderSort
): PlaylistTrack[] | undefined {
  const unmatchedById = new Map(files.map((file) => [file.id, file]));
  const unmatchedByPath = new Map(files.map((file) => [getPathKey(file), file]));

  function claim(file: FileMeta) {
    unmatchedById.delete(file.id);
    unmatchedByPath.delete(getPathKey(file));
    return file;
  }

  // Match by id first for every track, so a path match cannot take a file
  // that a later track matches by id
  const idMatches = tracks.map((track) => {
    const file = unmatchedById.get(track.id);
    return file ? claim(file) : undefined;
  });

  const kept: PlaylistTrack[] = [];
  tracks.forEach((track, index) => {
    const file = idMatches[index] ?? unmatchedByPath.get(getPathKey(track));
    if (!file) return;

    claim(file);
    kept.push(matchTrack(track, file));
  });

  const added = [...unmatchedById.values()].map(transformFile).sort(byPath);

  const next =
    sort === "name" ? [...kept, ...added].sort(byPath) : [...kept, ...added];

  const isUnchanged =
    next.length === tracks.length &&
    next.every((track, index) => track === tracks[index]);

  return isUnchanged ? undefined : next;
}
