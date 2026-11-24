import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it, vi } from "vitest";

import { useAudio } from "@/hooks/useAudio";
import {
  audioPostionAtom,
  durationAtom,
  playingPlaylistIdAtom,
  playingTrackIdAtom,
  seekToAtom,
} from "@/state/audio";
import { playlistsAtom } from "@/state/playlists";
import { transformFile } from "@/utils/file";
import { FileMeta, Playlist } from "@/utils/types";

vi.mock("@/api/file", () => ({ uploadFile: vi.fn() }));

function file(path: string) {
  return {
    ".tag": "file",
    id: `id:${path}`,
    name: path.split("/").pop(),
    path_display: path,
    path_lower: path.toLowerCase(),
    rev: "1",
    server_modified: "2026-10-01T12:00:00Z",
  } as FileMeta;
}

const playlistFile = file("/Band/Stuck In Heaven.mix");
const first = transformFile(file("/Band/First.mp3"));
const second = transformFile(file("/Band/Second.mp3"));

// Plays `trackId` from the two-track playlist, `positionMs` into a track
// `durationMs` long
function renderUseAudio({
  durationMs = 180_000,
  positionMs = 0,
  trackId = first.id,
}: { durationMs?: number; positionMs?: number; trackId?: string } = {}) {
  const store = createStore();
  store.set(playlistsAtom, [
    {
      data: { title: "Stuck In Heaven", tracks: [first, second] },
      meta: transformFile(playlistFile),
    } as Playlist,
  ]);
  store.set(playingPlaylistIdAtom, playlistFile.id);
  store.set(playingTrackIdAtom, trackId);
  store.set(durationAtom, durationMs);
  store.set(audioPostionAtom, positionMs);

  const { result } = renderHook(() => useAudio(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });
  return { result, store };
}

describe("useAudio", () => {
  describe("onSeekBy", () => {
    it("moves from the current position", () => {
      const { result, store } = renderUseAudio({ positionMs: 30_000 });

      act(() => result.current.onSeekBy(10_000));

      expect(store.get(seekToAtom)).toBe(40_000);
    });

    it("stops at the start of the track", () => {
      const { result, store } = renderUseAudio({ positionMs: 4_000 });

      act(() => result.current.onSeekBy(-10_000));

      expect(store.get(seekToAtom)).toBe(0);
    });

    it("stops at the end of the track", () => {
      const { result, store } = renderUseAudio({ positionMs: 175_000 });

      act(() => result.current.onSeekBy(10_000));

      expect(store.get(seekToAtom)).toBe(180_000);
    });

    it("has no end before the track's length is known", () => {
      const { result, store } = renderUseAudio({
        durationMs: 0,
        positionMs: 5_000,
      });

      act(() => result.current.onSeekBy(10_000));

      expect(store.get(seekToAtom)).toBe(15_000);
    });
  });

  describe("onPrevious", () => {
    it("goes to the previous track near the start of a track", () => {
      const { result, store } = renderUseAudio({
        positionMs: 2_000,
        trackId: second.id,
      });

      act(() => result.current.onPrevious());

      expect(store.get(playingTrackIdAtom)).toBe(first.id);
      expect(store.get(audioPostionAtom)).toBe(0);
    });

    it("restarts the track further in", () => {
      const { result, store } = renderUseAudio({
        positionMs: 45_000,
        trackId: second.id,
      });

      act(() => result.current.onPrevious());

      expect(store.get(playingTrackIdAtom)).toBe(second.id);
      expect(store.get(seekToAtom)).toBe(0);
    });

    it("restarts the first track", () => {
      const { result, store } = renderUseAudio({ positionMs: 1_000 });

      act(() => result.current.onPrevious());

      expect(store.get(playingTrackIdAtom)).toBe(first.id);
      expect(store.get(seekToAtom)).toBe(0);
    });
  });

  it("starts a new track at the beginning", () => {
    const { result, store } = renderUseAudio({ positionMs: 90_000 });

    act(() => result.current.onNext());

    expect(store.get(playingTrackIdAtom)).toBe(second.id);
    expect(store.get(audioPostionAtom)).toBe(0);
  });

  it("does not seek without a track", () => {
    const { result, store } = renderUseAudio({ trackId: "" });

    act(() => result.current.onSeekTo(10_000));

    expect(store.get(seekToAtom)).toBe(-1);
  });
});
