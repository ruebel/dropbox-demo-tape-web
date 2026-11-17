import { AudioState } from "@/utils/types";
import { atom } from "jotai";

export const durationAtom = atom(0);

export const isMutedAtom = atom(false);

export const audioPostionAtom = atom(0);

export const playingTrackIdAtom = atom("");

export const playingPlaylistIdAtom = atom("");

export const audioStateAtom = atom<AudioState>("stopped");

export const volumeAtom = atom(0.9);

export const seekToAtom = atom(-1);

export const showFullDetailsAtom = atom(false);

// Track errors that say nothing about the file, such as a dropped connection,
// by track id. Shown like saved errors, but kept out of the shared playlist
// so they do not mark the track as failed for everyone. A reload clears them.
export const sessionTrackErrorsAtom = atom<Readonly<Record<string, string>>>(
  {}
);
