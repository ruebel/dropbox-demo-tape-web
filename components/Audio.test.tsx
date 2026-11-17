import { act, cleanup, render } from "@testing-library/react";
import { DropboxResponseError } from "dropbox";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "@/api/file";
import { getTrackLink } from "@/api/track";
import { Audio } from "@/components/Audio";
import {
  audioStateAtom,
  playingPlaylistIdAtom,
  playingTrackIdAtom,
  sessionTrackErrorsAtom,
  volumeAtom,
} from "@/state/audio";
import { isAuthenticatedAtom } from "@/state/dropbox";
import { playlistsAtom } from "@/state/playlists";
import { transformFile } from "@/utils/file";
import { FileMeta, Playlist, PlaylistData } from "@/utils/types";

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

function notFound() {
  return new DropboxResponseError(409, {}, { error_summary: "path/not_found/.." });
}

type LinkResult = Awaited<ReturnType<typeof getTrackLink>>;

// A link request for `track` that the test finishes by hand. Its metadata
// matches the track, as Dropbox's does.
function deferredLink(track: FileMeta) {
  let resolve!: (link: string) => void;
  let reject!: (error: unknown) => void;
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
    // Loads a test does not set up never finish, so they cannot affect it
    vi.mocked(getTrackLink)
      .mockReset()
      .mockImplementation(() => new Promise(() => {}));
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
    await act(async () => firstLoad.reject(notFound()));

    // No error saved on the first track, and the player stays on the second
    expect(uploadFile).not.toHaveBeenCalled();
    expect(store.get(playingTrackIdAtom)).toBe(second.id);
    expect(store.get(audioStateAtom)).toBe("loading");
  });

  it("keeps a connection failure out of the shared playlist", async () => {
    vi.mocked(getTrackLink).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { store } = renderAudio();

    await vi.waitFor(() =>
      expect(store.get(sessionTrackErrorsAtom)[first.id]).toBe(
        "Couldn't reach Dropbox. Check your connection."
      )
    );
    expect(uploadFile).not.toHaveBeenCalled();
    // Moves on to the next track
    expect(store.get(playingTrackIdAtom)).toBe(second.id);
  });

  it("saves an error about the file in the shared playlist", async () => {
    vi.mocked(getTrackLink).mockRejectedValueOnce(notFound());
    const { store } = renderAudio();

    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(1));
    const saved: PlaylistData = vi.mocked(uploadFile).mock.calls[0][1];
    expect(saved.tracks[0]).toMatchObject({
      error: "This file was moved or deleted in Dropbox",
      errorCode: "not_found",
    });
    expect(store.get(sessionTrackErrorsAtom)).toEqual({});
  });

  it("clears a session error when the track loads", async () => {
    const load = deferredLink(first);
    vi.mocked(getTrackLink).mockReturnValue(load.promise);
    const { store } = renderAudio();
    act(() =>
      store.set(sessionTrackErrorsAtom, {
        [first.id]: "Couldn't reach Dropbox. Check your connection.",
      })
    );

    await act(async () => load.resolve("https://dl.test/first.mp3"));

    expect(store.get(sessionTrackErrorsAtom)).toEqual({});
  });
});
