import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { DropboxResponseError } from "dropbox";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "@/api/file";
import { getTrackLink } from "@/api/track";
import { Audio } from "@/components/Audio";
import {
  audioPostionAtom,
  audioStateAtom,
  durationAtom,
  playingPlaylistIdAtom,
  playingTrackIdAtom,
  sessionTrackErrorsAtom,
  volumeAtom,
} from "@/state/audio";
import { isAuthenticatedAtom } from "@/state/dropbox";
import { brokenImageIdsAtom, imageMapAtom } from "@/state/image";
import { playlistsAtom } from "@/state/playlists";
import { MEDIA_ERROR } from "@/utils/error";
import { transformFile } from "@/utils/file";
import {
  clearMediaSession,
  setMediaHandlers,
  setMediaPosition,
  setMediaTrack,
} from "@/utils/mediaSession";
import { FileMeta, Playlist, PlaylistData } from "@/utils/types";

vi.mock("@/api/file", () => ({ uploadFile: vi.fn() }));
vi.mock("@/api/track", () => ({ getTrackLink: vi.fn() }));
vi.mock("@/hooks/useErrorTracking", () => ({ logError: vi.fn() }));
vi.mock("@/utils/mediaSession", () => ({
  clearMediaSession: vi.fn(),
  setMediaHandlers: vi.fn(),
  setMediaPosition: vi.fn(),
  setMediaState: vi.fn(),
  setMediaTrack: vi.fn(),
}));

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

type Store = ReturnType<typeof createStore>;

// `image` is the playlist's image, and `setUp` changes the store before the
// player mounts
function renderAudio({
  image,
  setUp,
}: { image?: FileMeta; setUp?: (store: Store) => void } = {}) {
  const store = createStore();
  store.set(isAuthenticatedAtom, true);
  store.set(playlistsAtom, [
    {
      data: {
        artist: "Band",
        image: image && transformFile(image),
        title: "Stuck In Heaven",
        tracks: [first, second],
      },
      meta: transformFile(playlistFile),
    } as Playlist,
  ]);
  setUp?.(store);
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
function playTrack(store: Store, trackId: string) {
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

  it("ignores a play request that a newer load interrupted", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
      new DOMException("interrupted by a new load request", "AbortError")
    );
    const load = deferredLink(first);
    vi.mocked(getTrackLink).mockReturnValueOnce(load.promise);
    const { store } = renderAudio();

    await act(async () => load.resolve("https://dl.test/first.mp3"));

    expect(store.get(audioStateAtom)).toBe("loading");
    expect(store.get(sessionTrackErrorsAtom)).toEqual({});
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("shows the play button when the browser blocks playback", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
      new DOMException("play() needs a user gesture", "NotAllowedError")
    );
    const load = deferredLink(first);
    vi.mocked(getTrackLink).mockReturnValueOnce(load.promise);
    const { store } = renderAudio();

    await act(async () => load.resolve("https://dl.test/first.mp3"));

    expect(store.get(audioStateAtom)).toBe("paused");
  });

  it("loads the current track when resuming after its load was cancelled", async () => {
    const firstLoad = deferredLink(first);
    vi.mocked(getTrackLink).mockReturnValueOnce(firstLoad.promise);
    const { audio, store } = renderAudio();
    await act(async () => firstLoad.resolve("https://dl.test/first.mp3"));
    act(() => store.set(audioStateAtom, "playing"));

    // Switch tracks, then pause before the second track's link arrives
    playTrack(store, second.id);
    act(() => store.set(audioStateAtom, "paused"));
    const playCalls = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length;

    act(() => store.set(audioStateAtom, "playing"));

    // Loads the second track again instead of playing the first track's file
    expect(store.get(audioStateAtom)).toBe("loading");
    expect(vi.mocked(getTrackLink).mock.lastCall?.[1].id).toBe(second.id);
    expect(vi.mocked(HTMLMediaElement.prototype.play).mock.calls).toHaveLength(
      playCalls
    );
    expect(audio.getAttribute("src")).toBe("https://dl.test/first.mp3");
  });

  describe("when the audio element reports an error", () => {
    // Plays the first track, then makes the audio element fail with `code`
    // 42 seconds in, the way an expired link or a bad file does. `reload` is
    // the link the retry gets.
    async function playThenFail(
      code: number,
      reload: Promise<LinkResult> = new Promise(() => {})
    ) {
      const firstLoad = deferredLink(first);
      vi.mocked(getTrackLink)
        .mockReturnValueOnce(firstLoad.promise)
        .mockReturnValueOnce(reload);
      const result = renderAudio();
      await act(async () => firstLoad.resolve("https://dl.test/first.mp3"));
      act(() => result.store.set(audioStateAtom, "playing"));

      const { audio } = result;
      audio.currentTime = 42;
      Object.defineProperty(audio, "error", {
        configurable: true,
        value: { code },
      });
      fireEvent.error(audio);
      return result;
    }

    it("reloads the track once with a fresh link at the same spot", async () => {
      const reload = deferredLink(first);
      const { audio, store } = await playThenFail(
        MEDIA_ERROR.notSupported,
        reload.promise
      );

      expect(store.get(audioStateAtom)).toBe("loading");
      expect(vi.mocked(getTrackLink).mock.calls).toHaveLength(2);
      expect(vi.mocked(getTrackLink).mock.lastCall?.[1].id).toBe(first.id);

      // A new source starts at 0 until the reload puts it back
      audio.currentTime = 0;
      await act(async () => reload.resolve("https://dl.test/first-2.mp3"));

      expect(audio.getAttribute("src")).toBe("https://dl.test/first-2.mp3");
      expect(audio.currentTime).toBe(42);
      expect(uploadFile).not.toHaveBeenCalled();
    });

    it("saves an error about the file when the reload fails too", async () => {
      const reload = deferredLink(first);
      const { audio, store } = await playThenFail(MEDIA_ERROR.notSupported, reload.promise);
      await act(async () => reload.resolve("https://dl.test/first-2.mp3"));

      fireEvent.error(audio);

      await vi.waitFor(() => expect(uploadFile).toHaveBeenCalled());
      const saved: PlaylistData = vi.mocked(uploadFile).mock.lastCall?.[1];
      expect(saved.tracks[0].error).toBe(
        "This file can't be played in the browser"
      );
      expect(store.get(playingTrackIdAtom)).toBe(second.id);
    });

    it("shows a dropped download for this session only", async () => {
      const reload = deferredLink(first);
      const { audio, store } = await playThenFail(MEDIA_ERROR.network, reload.promise);
      await act(async () => reload.resolve("https://dl.test/first-2.mp3"));

      fireEvent.error(audio);

      expect(store.get(sessionTrackErrorsAtom)[first.id]).toBe(
        "The download stopped. Check your connection."
      );
      expect(uploadFile).not.toHaveBeenCalled();
      expect(store.get(playingTrackIdAtom)).toBe(second.id);
    });

    it("ignores an error from a source we replaced ourselves", async () => {
      const { store } = await playThenFail(MEDIA_ERROR.aborted);

      expect(store.get(audioStateAtom)).toBe("playing");
      expect(vi.mocked(getTrackLink).mock.calls).toHaveLength(1);
    });
  });

  describe("lock screen controls", () => {
    // The actions the player last gave the lock screen
    function lockScreen() {
      const handlers = vi.mocked(setMediaHandlers).mock.lastCall?.[0];
      if (!handlers) throw new Error("No lock screen actions were set");
      return handlers;
    }

    it("sets its actions once, even when the player re-renders", () => {
      const { store } = renderAudio();

      act(() => store.set(volumeAtom, 0.5));
      act(() => store.set(audioPostionAtom, 30_000));

      expect(setMediaHandlers).toHaveBeenCalledTimes(1);
    });

    it("offers next and previous only when there is a track to go to", () => {
      const { store } = renderAudio();
      expect(lockScreen().onNext).toBeDefined();
      expect(lockScreen().onPrevious).toBeUndefined();

      playTrack(store, second.id);

      expect(lockScreen().onNext).toBeUndefined();
      expect(lockScreen().onPrevious).toBeDefined();
    });

    it("stops when the lock screen asks", () => {
      const { store } = renderAudio();

      act(() => lockScreen().onStop());

      expect(store.get(audioStateAtom)).toBe("stopped");
    });

    it("clears the lock screen when playback stops, and shows the track again on play", () => {
      const { audio, store } = renderAudio();
      vi.mocked(clearMediaSession).mockClear();
      vi.mocked(setMediaTrack).mockClear();

      act(() => store.set(audioStateAtom, "stopped"));
      // Stopping pauses the player, which must not put the position back
      fireEvent.pause(audio);

      expect(clearMediaSession).toHaveBeenCalledTimes(1);
      expect(setMediaPosition).not.toHaveBeenCalled();

      act(() => store.set(audioStateAtom, "playing"));

      expect(setMediaTrack).toHaveBeenCalledTimes(1);
    });

    it("seeks from the latest position", () => {
      const { store } = renderAudio();
      act(() => store.set(durationAtom, 180_000));
      act(() => store.set(audioPostionAtom, 30_000));

      act(() => lockScreen().onSeekBy(10_000));

      expect(store.get(audioPostionAtom)).toBe(40_000);
    });

    it("tells the lock screen where playback paused or jumped to", () => {
      const { audio } = renderAudio();
      Object.defineProperty(audio, "duration", {
        configurable: true,
        value: 180,
      });

      audio.currentTime = 42;
      fireEvent.pause(audio);
      audio.currentTime = 90;
      fireEvent.seeked(audio);

      expect(vi.mocked(setMediaPosition).mock.calls).toEqual([
        [{ durationMs: 180_000, positionMs: 42_000 }],
        [{ durationMs: 180_000, positionMs: 90_000 }],
      ]);
    });
  });

  describe("lock screen artwork", () => {
    const cover = file("/Band/Cover.JPG");
    const coverLink = "https://dl.test/cover.jpg";

    function lastArtwork() {
      return vi.mocked(setMediaTrack).mock.lastCall?.[0].artwork;
    }

    it("uses the playlist image with its real type and no guessed size", () => {
      renderAudio({
        image: cover,
        setUp: (store) => store.set(imageMapAtom, { [cover.id]: coverLink }),
      });

      expect(lastArtwork()).toEqual([{ src: coverLink, type: "image/jpeg" }]);
    });

    it("uses the app icons when the playlist image is broken", () => {
      renderAudio({
        image: cover,
        setUp: (store) => {
          store.set(imageMapAtom, { [cover.id]: coverLink });
          store.set(brokenImageIdsAtom, new Set([cover.id]));
        },
      });

      // No artwork tells setMediaTrack to use its default app icons
      expect(lastArtwork()).toBeUndefined();
    });
  });
});
