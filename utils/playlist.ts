import { PlaylistTrack } from "@/utils/types";

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
