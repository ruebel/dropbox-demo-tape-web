import { act, cleanup, render } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "@/api/file";
import { getTrackLink } from "@/api/track";
import { Audio } from "@/components/Audio";
import {
  audioStateAtom,
  playingPlaylistIdAtom,
  playingTrackIdAtom,
  volumeAtom,
} from "@/state/audio";
import { isAuthenticatedAtom } from "@/state/dropbox";
import { playlistsAtom } from "@/state/playlists";
import { transformFile } from "@/utils/file";
import { FileMeta, Playlist } from "@/utils/types";

vi.mock("@/api/file", () => ({ uploadFile: vi.fn() }));
vi.mock("@/api/track", () => ({ getTrackLink: vi.fn() }));
vi.mock("@/hooks/useErrorTracking", () => ({ logError: vi.fn() }));

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

type LinkResult = Awaited<ReturnType<typeof getTrackLink>>;

// A link request for `track` that the test finishes by hand. Its metadata
// matches the track, as Dropbox's does.
function deferredLink(track: FileMeta) {
  let resolve!: (link: string) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<LinkResult>((res, rej) => {
    resolve = (link) => res({ link, metadata: track } as LinkResult);
    reject = rej;
  });
  return { promise, reject, resolve };
}

function renderAudio() {
  const store = createStore();
  store.set(isAuthenticatedAtom, true);
  store.set(playlistsAtom, [
    {
      data: { artist: "Band", title: "Stuck In Heaven", tracks: [first, second] },
      meta: transformFile(playlistFile),
    } as Playlist,
  ]);
  store.set(playingPlaylistIdAtom, playlistFile.id);
  store.set(playingTrackIdAtom, first.id);
  store.set(audioStateAtom, "loading");

  const { container } = render(
    <Provider store={store}>
      <Audio />
    </Provider>
  );
  const audio = container.querySelector("audio") as HTMLAudioElement;
  return { audio, store };
}

// Switches tracks the way useAudio's onPlay does
function playTrack(store: ReturnType<typeof createStore>, trackId: string) {
  act(() => {
    store.set(playingTrackIdAtom, trackId);
    store.set(audioStateAtom, "loading");
  });
}

describe("Audio", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.mocked(uploadFile).mockResolvedValue(playlistFile);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("requests a track's link once when it re-renders during the load", async () => {
    const load = deferredLink(first);
    vi.mocked(getTrackLink).mockReturnValue(load.promise);
    const { store } = renderAudio();

    // Any re-render while loading, here a volume change
    act(() => store.set(volumeAtom, 0.5));
    act(() => store.set(volumeAtom, 0.6));
    await act(async () => load.resolve("https://dl.test/first.mp3"));

    expect(getTrackLink).toHaveBeenCalledTimes(1);
  });

  it("ignores a link that arrives after switching tracks", async () => {
    const firstLoad = deferredLink(first);
    const secondLoad = deferredLink(second);
    vi.mocked(getTrackLink)
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);
    const { audio, store } = renderAudio();

    playTrack(store, second.id);
    await act(async () => secondLoad.resolve("https://dl.test/second.mp3"));
    await act(async () => firstLoad.resolve("https://dl.test/first.mp3"));

    expect(audio.getAttribute("src")).toBe("https://dl.test/second.mp3");
  });

  it("ignores a failure that arrives after switching tracks", async () => {
    const firstLoad = deferredLink(first);
    const secondLoad = deferredLink(second);
    vi.mocked(getTrackLink)
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);
    const { store } = renderAudio();

    playTrack(store, second.id);
    await act(async () => secondLoad.resolve("https://dl.test/second.mp3"));
    await act(async () => firstLoad.reject(new TypeError("Failed to fetch")));

    // No error saved on the first track, and the player stays on the second
    expect(uploadFile).not.toHaveBeenCalled();
    expect(store.get(playingTrackIdAtom)).toBe(second.id);
    expect(store.get(audioStateAtom)).toBe("loading");
  });
});
