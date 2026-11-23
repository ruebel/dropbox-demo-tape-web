import { PlaylistFolder, PlaylistTrack } from "@/utils/types";

/**
 * The text that says which folder a folder playlist shows, for its icon's
 * label and hover
 */
export function getSyncedWithLabel(folder: PlaylistFolder) {
  return folder.includeSubfolders
    ? `Synced with ${folder.path} and its subfolders`
    : `Synced with ${folder.path}`;
}

/**
 * Combines a track list edited on a page with the latest saved tracks. The
 * edited list decides which tracks are in the playlist and their order. The
 * latest saved version of each track decides its details (duration, error,
 * path), because the player can save those while the page is open. Tracks
 * that are only in the edited list (just added) are kept as they are.
 */
export function mergeEditedTracks(
  latest: PlaylistTrack[],
  edited: PlaylistTrack[]
) {
  const latestById = new Map(latest.map((track) => [track.id, track]));

  return edited.map((track) => latestById.get(track.id) ?? track);
}

/**
 * Combines a folder playlist's track order edited on a page with the latest
 * saved tracks. The latest saved list decides which tracks are in the
 * playlist, because a sync can add or remove files while the page is open.
 * The edited list decides their order. Tracks that are only in the latest
 * list (added by a sync) go at the end, in their saved order.
 */
export function mergeEditedOrder(
  latest: PlaylistTrack[],
  edited: PlaylistTrack[]
) {
  const editedIndex = new Map(edited.map((track, index) => [track.id, index]));
  const position = (track: PlaylistTrack) =>
    editedIndex.get(track.id) ?? edited.length;

  // A stable sort, so tracks added by a sync keep their saved order
  return [...latest].sort((a, b) => position(a) - position(b));
}
