import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { Dropbox } from "dropbox";
import { createStore, Provider, useAtomValue } from "jotai";
import { StrictMode, Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "@/api/file";
import { listFolderAudioFiles } from "@/api/folder";
import { downloadPlaylists, searchPlaylistFiles } from "@/api/playlists";
import { useCacheSync } from "@/hooks/useCacheSync";
import { logError } from "@/hooks/useErrorTracking";
import { dbxAtom, isAuthenticatedAtom } from "@/state/dropbox";
import {
  dbPlaylistFilesAtom,
  isSyncingPlaylistsAtom,
  loadableDBPlaylistFiles,
  playlistAtom,
  playlistSyncErrorAtom,
  playlistsAtom,
  syncFolderPlaylistAtom,
  updatePlaylistAtom,
  updatePlaylistTrackAtom,
} from "@/state/playlists";
import { transformFile } from "@/utils/file";
import { FileMeta, Playlist, PlaylistTrack } from "@/utils/types";

vi.mock("@/api/playlists", () => ({
  downloadPlaylists: vi.fn(),
  searchPlaylistFiles: vi.fn(),
}));
vi.mock("@/api/file", () => ({ uploadFile: vi.fn() }));
vi.mock("@/api/folder", () => ({ listFolderAudioFiles: vi.fn() }));
vi.mock("@/api/user", () => ({ getUsers: vi.fn().mockResolvedValue([]) }));
vi.mock("@/hooks/useErrorTracking", () => ({ logError: vi.fn() }));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function makeFile(id: string, rev = "1") {
  return {
    ".tag": "file",
    id,
    name: `${id}.mix`,
    path_display: `/Demos/${id}.mix`,
    path_lower: `/demos/${id}.mix`,
    rev,
    server_modified: `2026-10-0${rev}T12:00:00Z`,
  } as FileMeta;
}

// The title records which revision the contents came from
function makePlaylist(file: FileMeta, title = `${file.id} r${file.rev}`) {
  return {
    data: { artist: "Artist", title, tracks: [] },
    meta: transformFile(file),
  } as unknown as Playlist;
}

// Mounts the cache sync effect, the way Header does
function CacheSync() {
  useCacheSync();
  return null;
}

// Reads the cached list and subscribes to the search, the way Playlists does
function PlaylistCount() {
  const playlists = useAtomValue(playlistsAtom);
  useAtomValue(loadableDBPlaylistFiles);
  return <div data-testid="count">{playlists.length}</div>;
}

type Store = ReturnType<typeof createStore>;

// `cacheSyncKey` lets a test remount CacheSync, like Fast Refresh does
function App({ cacheSyncKey = 0, store }: { cacheSyncKey?: number; store: Store }) {
  return (
    <StrictMode>
      <Provider store={store}>
        <Suspense fallback={null}>
          <CacheSync key={cacheSyncKey} />
        </Suspense>
        <PlaylistCount />
      </Provider>
    </StrictMode>
  );
}

function titles(store: Store) {
  return store.get(playlistsAtom).map((p) => p.data.title).sort();
}

async function expectCount(count: number) {
  await waitFor(() =>
    expect(screen.getByTestId("count").textContent).toBe(String(count))
  );
}

describe("dbPlaylistAtomEffect", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(searchPlaylistFiles).mockImplementation(async () => {
      await sleep(50);
      return [makeFile("a"), makeFile("b")];
    });
    vi.mocked(downloadPlaylists).mockImplementation(async (_dbx, files) => {
      await sleep(50);
      return files.map((file) => makePlaylist(file));
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("copies fetched playlists into an empty cache when auth finishes after mount", async () => {
    const store = createStore();
    render(<App store={store} />);

    act(() => store.set(isAuthenticatedAtom, true));

    await expectCount(2);
  });

  it("copies fetched playlists into an empty cache when already authenticated", async () => {
    const store = createStore();
    store.set(isAuthenticatedAtom, true);
    render(<App store={store} />);

    await expectCount(2);
    expect(store.get(isSyncingPlaylistsAtom)).toBe(false);
  });

  // Regression: jotai-effect 0.5 with jotai 2.20 stopped running the effect
  // after a remount while the fetch was loading, so the cache stayed empty
  it("copies fetched playlists after the effect remounts while the fetch is loading", async () => {
    const store = createStore();
    store.set(isAuthenticatedAtom, true);
    const { rerender } = render(<App cacheSyncKey={1} store={store} />);

    // Remount before the 50ms search resolves
    await act(() => sleep(20));
    rerender(<App cacheSyncKey={2} store={store} />);

    await expectCount(2);
  });

  // atomWithStorage loads the cache on mount, after the first render
  it("shows cached playlists from storage before auth finishes", async () => {
    localStorage.setItem(
      "dt",
      JSON.stringify({
        playlists: [makePlaylist(makeFile("a")), makePlaylist(makeFile("b"))],
      })
    );
    const store = createStore();
    render(<App store={store} />);

    await expectCount(2);
    expect(searchPlaylistFiles).not.toHaveBeenCalled();
  });

  it("downloads only playlists that changed since they were cached", async () => {
    localStorage.setItem(
      "dt",
      JSON.stringify({
        playlists: [makePlaylist(makeFile("a")), makePlaylist(makeFile("b"))],
      })
    );
    vi.mocked(searchPlaylistFiles).mockResolvedValue([
      makeFile("a"), // unchanged
      makeFile("b", "2"), // changed
      makeFile("c"), // new
    ]);
    const store = createStore();
    store.set(isAuthenticatedAtom, true);
    render(<App store={store} />);

    await expectCount(3);

    expect(downloadPlaylists).toHaveBeenCalledTimes(1);
    const [, downloaded] = vi.mocked(downloadPlaylists).mock.calls[0];
    expect(downloaded.map((file) => `${file.id} r${file.rev}`)).toEqual([
      "b r2",
      "c r1",
    ]);
    expect(titles(store)).toEqual(["a r1", "b r2", "c r1"]);
  });

  // Regression: if the effect subscribed to the cache, every cache write
  // (save, delete, add) would start another search and sync
  it("does not search again when the cache changes", async () => {
    const store = createStore();
    store.set(isAuthenticatedAtom, true);
    render(<App store={store} />);
    await expectCount(2);

    const searches = vi.mocked(searchPlaylistFiles).mock.calls.length;
    const downloads = vi.mocked(downloadPlaylists).mock.calls.length;

    act(() => store.set(playlistsAtom, [makePlaylist(makeFile("a"))]));
    await act(() => sleep(150));

    await expectCount(1);
    expect(searchPlaylistFiles).toHaveBeenCalledTimes(searches);
    expect(downloadPlaylists).toHaveBeenCalledTimes(downloads);
  });

  it("drops a stale sync when the search runs again", async () => {
    let staleSignal: AbortSignal | undefined;
    vi.mocked(downloadPlaylists)
      .mockImplementationOnce(async (_dbx, files, signal) => {
        staleSignal = signal;
        await sleep(100);
        return files.map((file) => makePlaylist(file, "stale"));
      })
      .mockImplementation(async (_dbx, files) =>
        files.map((file) => makePlaylist(file, "fresh"))
      );
    const store = createStore();
    store.set(isAuthenticatedAtom, true);
    render(<App store={store} />);
    await waitFor(() => expect(downloadPlaylists).toHaveBeenCalledTimes(1));

    // A token refresh creates a new client, which runs the search again
    act(() => store.set(dbxAtom, {} as Dropbox));

    await waitFor(() => expect(titles(store)).toEqual(["fresh", "fresh"]));
    expect(staleSignal?.aborted).toBe(true);

    // The stale download finishing later does not overwrite the cache
    await act(() => sleep(150));
    expect(titles(store)).toEqual(["fresh", "fresh"]);
    expect(store.get(isSyncingPlaylistsAtom)).toBe(false);
  });

  it("records a failed sync and clears it when a retry succeeds", async () => {
    const error = new Error("Failed to fetch");
    vi.mocked(downloadPlaylists).mockRejectedValueOnce(error);
    const store = createStore();
    store.set(isAuthenticatedAtom, true);
    render(<App store={store} />);

    await waitFor(() => expect(store.get(playlistSyncErrorAtom)).toBe(error));
    expect(store.get(playlistsAtom)).toEqual([]);
    expect(store.get(isSyncingPlaylistsAtom)).toBe(false);

    // Same as the "Try again" button
    act(() => store.set(dbPlaylistFilesAtom));

    await expectCount(2);
    expect(store.get(playlistSyncErrorAtom)).toBeNull();
  });
});

describe("updatePlaylistTrackAtom", () => {
  const playlistFile = makeFile("a");

  function makeTrack(): PlaylistTrack {
    return {
      ...transformFile({
        ".tag": "file",
        id: "id:track",
        name: "Song.mp3",
        path_display: "/Demos/Song.mp3",
        path_lower: "/demos/song.mp3",
        rev: "1",
        server_modified: "2026-10-01T12:00:00Z",
      } as FileMeta),
      duration: 168.07,
      error: "Failed to load track",
    };
  }

  function makeStore() {
    const store = createStore();
    const playlist = makePlaylist(playlistFile);
    playlist.data.tracks = [makeTrack()];
    store.set(playlistsAtom, [playlist]);
    return store;
  }

  function savedTrack(store: ReturnType<typeof createStore>) {
    return store.get(playlistsAtom)[0].data.tracks[0];
  }

  beforeEach(() => {
    localStorage.clear();
    // Like a real upload, finishes some time after it starts
    vi.mocked(uploadFile).mockImplementation(async () => {
      await sleep(20);
      return playlistFile;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps both changes when two updates start back to back", async () => {
    const store = makeStore();
    const playlistId = playlistFile.id;
    const trackId = "id:track";

    // Like a moved file being found and then its duration loading
    const moved = store.set(updatePlaylistTrackAtom, {
      playlistId,
      trackId,
      update: (t) => ({ ...t, error: undefined, path_lower: "/archive/song.mp3" }),
    });
    const timed = store.set(updatePlaylistTrackAtom, {
      playlistId,
      trackId,
      update: (t) => ({ ...t, duration: 168 }),
    });
    await Promise.all([moved, timed]);

    expect(uploadFile).toHaveBeenCalledTimes(2);
    const [, lastUpload] = vi.mocked(uploadFile).mock.calls[1];
    expect(lastUpload.tracks[0]).toMatchObject({
      duration: 168,
      error: undefined,
      path_lower: "/archive/song.mp3",
    });
    expect(savedTrack(store)).toMatchObject({
      duration: 168,
      error: undefined,
      path_lower: "/archive/song.mp3",
    });
  });

  it("does not upload when the update changes nothing", async () => {
    const store = makeStore();

    await store.set(updatePlaylistTrackAtom, {
      playlistId: playlistFile.id,
      trackId: "id:track",
      update: () => undefined,
    });

    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("runs the next update after a failed save", async () => {
    const store = makeStore();
    vi.mocked(uploadFile).mockRejectedValueOnce(new Error("Failed to fetch"));

    const failed = store.set(updatePlaylistTrackAtom, {
      playlistId: playlistFile.id,
      trackId: "id:track",
      update: (t) => ({ ...t, error: "Dropbox error: too_many_write_operations" }),
    });
    const next = store.set(updatePlaylistTrackAtom, {
      playlistId: playlistFile.id,
      trackId: "id:track",
      update: (t) => ({ ...t, duration: 168 }),
    });

    await expect(failed).rejects.toThrow("Failed to fetch");
    await next;

    expect(savedTrack(store)).toMatchObject({
      duration: 168,
      error: "Failed to load track",
    });
  });

  it("queues a whole-playlist update behind a track update", async () => {
    const store = makeStore();
    const playlistId = playlistFile.id;

    const timed = store.set(updatePlaylistTrackAtom, {
      playlistId,
      trackId: "id:track",
      update: (t) => ({ ...t, duration: 168 }),
    });
    const retitled = store.set(updatePlaylistAtom, {
      playlistId,
      update: (p) => ({ ...p, data: { ...p.data, title: "Renamed" } }),
    });
    await Promise.all([timed, retitled]);

    const [, lastUpload] = vi.mocked(uploadFile).mock.calls[1];
    expect(lastUpload.title).toBe("Renamed");
    expect(lastUpload.tracks[0].duration).toBe(168);
  });
});

describe("playlistAtom", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps a save to another playlist that finished during this one", async () => {
    localStorage.clear();
    const fileA = makeFile("a");
    const fileB = makeFile("b");
    const store = createStore();
    store.set(playlistsAtom, [makePlaylist(fileA), makePlaylist(fileB)]);
    // Playlist a uploads slowly, so playlist b finishes first
    vi.mocked(uploadFile).mockImplementation(async (_dbx, _data, path) => {
      await sleep(path === fileA.path_lower ? 40 : 5);
      return path === fileA.path_lower ? fileA : fileB;
    });

    const [a, b] = store.get(playlistsAtom);
    await Promise.all([
      store.set(playlistAtom(fileA.id), {
        ...a,
        data: { ...a.data, title: "a renamed" },
      }),
      store.set(playlistAtom(fileB.id), {
        ...b,
        data: { ...b.data, title: "b renamed" },
      }),
    ]);

    expect(titles(store)).toEqual(["a renamed", "b renamed"]);
  });
});

describe("syncFolderPlaylistAtom", () => {
  const playlistFile = makeFile("tape");

  function audioFile(name: string) {
    return {
      ".tag": "file",
      id: `id:${name}`,
      name,
      path_display: `/Demos/${name}`,
      path_lower: `/demos/${name.toLowerCase()}`,
      rev: "1",
      server_modified: "2026-10-01T12:00:00Z",
    } as FileMeta;
  }

  function makeStore(tracks: PlaylistTrack[], hasFolder = true) {
    const store = createStore();
    const playlist = makePlaylist(playlistFile);
    playlist.data.tracks = tracks;
    if (hasFolder) {
      playlist.data.folder = { id: "id:folder", path: "/Demos", sort: "name" };
    }
    store.set(playlistsAtom, [playlist]);
    return store;
  }

  function savedNames(store: Store) {
    return store.get(playlistsAtom)[0].data.tracks.map((t) => t.name);
  }

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(uploadFile).mockImplementation(async () => {
      await sleep(20);
      return playlistFile;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("saves the tracks when the folder changed and returns the cursor", async () => {
    const a = audioFile("a.mp3");
    const b = audioFile("b.mp3");
    const store = makeStore([transformFile(a)]);
    vi.mocked(listFolderAudioFiles).mockResolvedValue({
      cursor: "c1",
      files: [b, a],
    });

    const cursor = await store.set(syncFolderPlaylistAtom, playlistFile.id);

    expect(cursor).toBe("c1");
    expect(listFolderAudioFiles).toHaveBeenCalledWith(
      expect.anything(),
      "id:folder"
    );
    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(savedNames(store)).toEqual(["a.mp3", "b.mp3"]);
  });

  it("does not upload when the folder did not change", async () => {
    const a = audioFile("a.mp3");
    const store = makeStore([transformFile(a)]);
    vi.mocked(listFolderAudioFiles).mockResolvedValue({
      cursor: "c1",
      files: [a],
    });

    const cursor = await store.set(syncFolderPlaylistAtom, playlistFile.id);

    expect(cursor).toBe("c1");
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("does nothing for a playlist without a folder", async () => {
    const store = makeStore([], false);

    const cursor = await store.set(syncFolderPlaylistAtom, playlistFile.id);

    expect(cursor).toBeUndefined();
    expect(listFolderAudioFiles).not.toHaveBeenCalled();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("matches against the latest saved playlist", async () => {
    const a = audioFile("a.mp3");
    const b = audioFile("b.mp3");
    const c = audioFile("c.mp3");
    const store = makeStore([transformFile(a), transformFile(b)]);
    vi.mocked(listFolderAudioFiles).mockResolvedValue({
      cursor: "c1",
      files: [a, b, c],
    });

    // An edit that reorders the tracks is saving when the sync starts
    const reordered = store.set(updatePlaylistAtom, {
      playlistId: playlistFile.id,
      update: (p) => ({
        ...p,
        data: {
          ...p.data,
          folder: { ...p.data.folder!, sort: "custom" },
          tracks: [...p.data.tracks].reverse(),
        },
      }),
    });
    const synced = store.set(syncFolderPlaylistAtom, playlistFile.id);
    await Promise.all([reordered, synced]);

    // The new file goes after the custom order
    expect(savedNames(store)).toEqual(["b.mp3", "a.mp3", "c.mp3"]);
  });

  it("logs a failed save and still returns the cursor", async () => {
    const error = new Error("Failed to fetch");
    vi.mocked(uploadFile).mockRejectedValueOnce(error);
    const store = makeStore([]);
    vi.mocked(listFolderAudioFiles).mockResolvedValue({
      cursor: "c1",
      files: [audioFile("a.mp3")],
    });

    const cursor = await store.set(syncFolderPlaylistAtom, playlistFile.id);

    expect(cursor).toBe("c1");
    expect(logError).toHaveBeenCalledWith(error);
    expect(savedNames(store)).toEqual([]);
  });

  it("throws when the folder cannot be listed", async () => {
    const store = makeStore([]);
    vi.mocked(listFolderAudioFiles).mockRejectedValue(
      new Error("path/not_found")
    );

    await expect(
      store.set(syncFolderPlaylistAtom, playlistFile.id)
    ).rejects.toThrow("path/not_found");
    expect(uploadFile).not.toHaveBeenCalled();
  });
});
