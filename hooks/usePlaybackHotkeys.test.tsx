import { cleanup, fireEvent, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePlaybackHotkeys } from "@/hooks/usePlaybackHotkeys";
import {
  audioPostionAtom,
  audioStateAtom,
  durationAtom,
  playingPlaylistIdAtom,
  playingTrackIdAtom,
  seekToAtom,
} from "@/state/audio";
import { playlistsAtom } from "@/state/playlists";
import { transformFile } from "@/utils/file";
import { AudioState, FileMeta, Playlist } from "@/utils/types";

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
const track = transformFile(file("/Band/First.mp3"));

// A 3-minute track, 30 seconds in
function renderHotkeys(audioState: AudioState = "playing") {
  const store = createStore();
  store.set(playlistsAtom, [
    {
      data: { title: "Stuck In Heaven", tracks: [track] },
      meta: transformFile(playlistFile),
    } as Playlist,
  ]);
  store.set(playingPlaylistIdAtom, playlistFile.id);
  store.set(playingTrackIdAtom, track.id);
  store.set(audioStateAtom, audioState);
  store.set(durationAtom, 180_000);
  store.set(audioPostionAtom, 30_000);

  renderHook(() => usePlaybackHotkeys(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });
  return store;
}

// Adds an element to the page, for a key press that starts on it
function addElement(html: string) {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  document.body.append(holder);
  return holder.firstElementChild as HTMLElement;
}

function pressSpace(target: Element = document.body) {
  // False when the shortcut stopped the browser's own action
  return fireEvent.keyDown(target, { code: "Space", key: " " });
}

function pressArrow(direction: "Left" | "Right", target: Element = document.body) {
  fireEvent.keyDown(target, {
    code: `Arrow${direction}`,
    key: `Arrow${direction}`,
  });
}

describe("usePlaybackHotkeys", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  describe("Space", () => {
    it("pauses a playing track, without scrolling the page", () => {
      const store = renderHotkeys("playing");

      const didScroll = pressSpace();

      expect(store.get(audioStateAtom)).toBe("paused");
      expect(didScroll).toBe(false);
    });

    it("plays a paused track", () => {
      const store = renderHotkeys("paused");

      pressSpace();

      expect(store.get(audioStateAtom)).toBe("playing");
    });

    it("waits while a track loads", () => {
      const store = renderHotkeys("loading");

      pressSpace();

      expect(store.get(audioStateAtom)).toBe("loading");
    });

    it("leaves a focused button to press itself", () => {
      const store = renderHotkeys("playing");
      const button = addElement("<button>Play this track</button>");

      const didPress = pressSpace(button);

      expect(store.get(audioStateAtom)).toBe("playing");
      expect(didPress).toBe(true);
    });

    it("leaves a track in the drag-and-drop list to be picked up", () => {
      const store = renderHotkeys("playing");
      const handle = addElement(
        '<div tabindex="0" data-rfd-drag-handle-draggable-id="1">Track</div>'
      );

      pressSpace(handle);

      expect(store.get(audioStateAtom)).toBe("playing");
    });

    it("types in a text field", () => {
      const store = renderHotkeys("playing");
      const input = addElement('<input type="text" />');

      pressSpace(input);

      expect(store.get(audioStateAtom)).toBe("playing");
    });
  });

  describe("arrows", () => {
    it("move playback 10 seconds back and forward", () => {
      const store = renderHotkeys();

      pressArrow("Right");
      expect(store.get(seekToAtom)).toBe(40_000);

      pressArrow("Left");
      expect(store.get(seekToAtom)).toBe(20_000);
    });

    it("work while a button has focus", () => {
      const store = renderHotkeys();
      const button = addElement("<button>Pause</button>");

      pressArrow("Right", button);

      expect(store.get(seekToAtom)).toBe(40_000);
    });

    it("leave a slider to move itself", () => {
      const store = renderHotkeys();
      const slider = addElement('<input type="range" />');

      pressArrow("Right", slider);

      expect(store.get(seekToAtom)).toBe(-1);
    });

    it("leave a picked-up track to move in the list", () => {
      const store = renderHotkeys();
      const handle = addElement(
        '<div tabindex="0" data-rfd-drag-handle-draggable-id="1">Track</div>'
      );

      pressArrow("Right", handle);

      expect(store.get(seekToAtom)).toBe(-1);
    });
  });
});
