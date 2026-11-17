import { ImageMap } from "@/utils/types";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const imageMapAtom = atomWithStorage<ImageMap>("playlistImages", {});

// Image links fetched during this session, by any PlaylistImage. A link in
// imageMapAtom that is not here was saved in an earlier session and has
// probably expired. Not saved, so a reload clears it.
export const freshImageLinksAtom = atom<ReadonlySet<string>>(new Set<string>());

// Images that failed with a link fetched this session. Every PlaylistImage
// shows the fallback for these and stops fetching links. Not saved, so a
// reload tries again.
export const brokenImageIdsAtom = atom<ReadonlySet<string>>(new Set<string>());

// Link requests still waiting on Dropbox, by image id. Copies of the same
// image (the playlist header and the player bar) wait on one request instead
// of each asking for a link. Each store gets its own map.
export const imageLinkRequestsAtom = atom(
  () => new Map<string, Promise<string>>()
);
