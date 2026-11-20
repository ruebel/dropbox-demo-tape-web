import { act, cleanup, renderHook } from "@testing-library/react";
import { DropboxResponseError } from "dropbox";
import { createStore, Provider } from "jotai";
import { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "@/api/file";
import { listFolderAudioFiles, watchFolder } from "@/api/folder";
import { useFolderSync } from "@/hooks/useFolderSync";
import { isAuthenticatedAtom } from "@/state/dropbox";
import { playlistsAtom } from "@/state/playlists";
import { transformFile } from "@/utils/file";
import { FileMeta, Playlist } from "@/utils/types";

vi.mock("@/api/folder", () => ({
  listFolderAudioFiles: vi.fn(),
  watchFolder: vi.fn(),
}));
vi.mock("@/api/file", () => ({ uploadFile: vi.fn() }));
vi.mock("@/hooks/useErrorTracking", () => ({ logError: vi.fn() }));

const playlistFile = {
  ".tag": "file",
  id: "id:tape",
  name: "Tape.mix",
  path_display: "/Demos/Tape.mix",
  path_lower: "/demos/tape.mix",
  rev: "1",
  server_modified: "2026-10-01T12:00:00Z",
} as FileMeta;

const song = {
  ".tag": "file",
  id: "id:song",
  name: "Song.mp3",
  path_display: "/Demos/Song.mp3",
  path_lower: "/demos/song.mp3",
  rev: "1",
  server_modified: "2026-10-01T12:00:00Z",
} as FileMeta;

function makeStore({ hasFolder = true, isAuthenticated = true } = {}) {
  const store = createStore();
  store.set(isAuthenticatedAtom, isAuthenticated);
  store.set(playlistsAtom, [
    {
      data: {
        artist: "Artist",
        title: "Tape",
        tracks: [],
        ...(hasFolder && {
          folder: { id: "id:folder", path: "/Demos", sort: "name" },
        }),
      },
      meta: transformFile(playlistFile),
    } as Playlist,
  ]);
  return store;
}

function renderSync(store: ReturnType<typeof createStore>) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useFolderSync(playlistFile.id), { wrapper });
}

// The options the hook passed to the last watch it started
function lastWatch() {
  const [, cursor, options] = vi.mocked(watchFolder).mock.lastCall!;
  return { cursor, ...options };
}

describe("useFolderSync", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(watchFolder).mockResolvedValue(undefined);
    vi.mocked(uploadFile).mockResolvedValue(playlistFile as never);
    vi.mocked(listFolderAudioFiles).mockResolvedValue({
      cursor: "c1",
      files: [song],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("does not watch a playlist without a folder", () => {
    renderSync(makeStore({ hasFolder: false }));

    expect(watchFolder).not.toHaveBeenCalled();
  });

  it("does not watch before the user is signed in", () => {
    renderSync(makeStore({ isAuthenticated: false }));

    expect(watchFolder).not.toHaveBeenCalled();
  });

  it("starts a watch that syncs first, and stops it on unmount", () => {
    const { unmount } = renderSync(makeStore());

    const { cursor, signal } = lastWatch();
    expect(cursor).toBeUndefined();
    expect(signal.aborted).toBe(false);

    unmount();
    expect(signal.aborted).toBe(true);
  });

  it("syncs the folder when the watch reports a change", async () => {
    const store = makeStore();
    const { result } = renderSync(store);

    let cursor: string | undefined;
    await act(async () => {
      cursor = await lastWatch().onChange();
    });

    expect(cursor).toBe("c1");
    expect(store.get(playlistsAtom)[0].data.tracks.map((t) => t.name)).toEqual(
      ["Song.mp3"]
    );
    expect(result.current).toEqual({ errorMessage: null, isSyncing: false });
  });

  it("shows that it is syncing until the sync finishes", async () => {
    let finishListing = () => {};
    vi.mocked(listFolderAudioFiles).mockReturnValue(
      new Promise((resolve) => {
        finishListing = () => resolve({ cursor: "c1", files: [] });
      })
    );
    const { result } = renderSync(makeStore());

    let syncing: Promise<string | undefined> = Promise.resolve(undefined);
    act(() => {
      syncing = lastWatch().onChange();
    });
    expect(result.current.isSyncing).toBe(true);

    await act(async () => {
      finishListing();
      await syncing;
    });
    expect(result.current.isSyncing).toBe(false);
  });

  it("shows an error when the folder is gone and clears it after a sync works", async () => {
    vi.mocked(listFolderAudioFiles).mockRejectedValueOnce(
      new DropboxResponseError(409, {}, { error_summary: "path/not_found/.." })
    );
    const { result } = renderSync(makeStore());
    const { onChange } = lastWatch();

    await act(async () => {
      // Rethrown so the watch tries again
      await expect(onChange()).rejects.toBeInstanceOf(DropboxResponseError);
    });
    expect(result.current.errorMessage).toMatch(/Couldn't find this playlist's folder/);

    await act(async () => {
      await onChange();
    });
    expect(result.current.errorMessage).toBeNull();
  });

  it("shows a connection error for other failures", async () => {
    vi.mocked(listFolderAudioFiles).mockRejectedValueOnce(
      new TypeError("Failed to fetch")
    );
    const { result } = renderSync(makeStore());

    await act(async () => {
      await expect(lastWatch().onChange()).rejects.toBeInstanceOf(TypeError);
    });

    expect(result.current.errorMessage).toMatch(/Check your connection/);
  });
});
