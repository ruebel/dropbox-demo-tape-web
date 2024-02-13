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
