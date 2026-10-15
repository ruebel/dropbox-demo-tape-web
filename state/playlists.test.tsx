import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { Dropbox } from "dropbox";
import { createStore, Provider, useAtomValue } from "jotai";
import { StrictMode, Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadPlaylists, searchPlaylistFiles } from "@/api/playlists";
import { useCacheSync } from "@/hooks/useCacheSync";
import { dbxAtom, isAuthenticatedAtom } from "@/state/dropbox";
import {
  dbPlaylistFilesAtom,
  isSyncingPlaylistsAtom,
  loadableDBPlaylistFiles,
  playlistSyncErrorAtom,
  playlistsAtom,
} from "@/state/playlists";
import { transformFile } from "@/utils/file";
import { FileMeta, Playlist } from "@/utils/types";

vi.mock("@/api/playlists", () => ({
  downloadPlaylists: vi.fn(),
  searchPlaylistFiles: vi.fn(),
}));
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
