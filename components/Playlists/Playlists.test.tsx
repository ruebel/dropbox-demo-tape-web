import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { StrictMode, Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadPlaylists, searchPlaylistFiles } from "@/api/playlists";
import { Playlists } from "@/components/Playlists/Playlists";
import { useCacheSync } from "@/hooks/useCacheSync";
import { isAuthenticatedAtom } from "@/state/dropbox";
import { transformFile } from "@/utils/file";
import { FileMeta, Playlist } from "@/utils/types";

vi.mock("@/api/playlists", () => ({
  downloadPlaylists: vi.fn(),
  searchPlaylistFiles: vi.fn(),
}));
vi.mock("@/api/user", () => ({ getUsers: vi.fn().mockResolvedValue([]) }));
vi.mock("@/hooks/useErrorTracking", () => ({ logError: vi.fn() }));

const ERROR_HEADING = "Couldn't load your playlists";

function makeFile(id: string) {
  return {
    ".tag": "file",
    id,
    name: `${id}.mix`,
    path_display: `/Demos/${id}.mix`,
    path_lower: `/demos/${id}.mix`,
    rev: "1",
    server_modified: "2026-10-01T12:00:00Z",
  } as FileMeta;
}

function makePlaylist(file: FileMeta) {
  return {
    data: { artist: "Artist", title: `Playlist ${file.id}`, tracks: [] },
    meta: transformFile(file),
  } as unknown as Playlist;
}

// Mounts the cache sync effect, the way Header does
function CacheSync() {
  useCacheSync();
  return null;
}

function renderPlaylists() {
  const store = createStore();
  store.set(isAuthenticatedAtom, true);
  render(
    <StrictMode>
      <Provider store={store}>
        <Suspense fallback={null}>
          <CacheSync />
        </Suspense>
        <Playlists />
      </Provider>
    </StrictMode>
  );
}

describe("Playlists", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(searchPlaylistFiles).mockResolvedValue([
      makeFile("a"),
      makeFile("b"),
    ]);
    vi.mocked(downloadPlaylists).mockImplementation(async (_dbx, files) =>
      files.map(makePlaylist)
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows an error when the search fails and nothing is cached", async () => {
    vi.mocked(searchPlaylistFiles).mockRejectedValue(new Error("Failed to fetch"));

    renderPlaylists();

    expect((await screen.findByRole("alert")).textContent).toContain(ERROR_HEADING);
    expect(screen.queryByText("No playlists found")).toBeNull();
  });

  it("loads the playlists when the user tries again", async () => {
    vi.mocked(searchPlaylistFiles).mockRejectedValueOnce(
      new Error("Failed to fetch")
    );

    renderPlaylists();
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Playlist a")).toBeTruthy();
    expect(screen.getByText("Playlist b")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows an error when the downloads fail and nothing is cached", async () => {
    vi.mocked(downloadPlaylists).mockRejectedValue(new Error("Failed to fetch"));

    renderPlaylists();

    expect((await screen.findByRole("alert")).textContent).toContain(ERROR_HEADING);
  });

  it("shows the empty state when no playlists are found", async () => {
    vi.mocked(searchPlaylistFiles).mockResolvedValue([]);

    renderPlaylists();

    expect(await screen.findByText("No playlists found")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps showing cached playlists when the search fails", async () => {
    localStorage.setItem(
      "dt",
      JSON.stringify({ playlists: [makePlaylist(makeFile("a"))] })
    );
    vi.mocked(searchPlaylistFiles).mockRejectedValue(new Error("Failed to fetch"));

    renderPlaylists();

    expect(await screen.findByText("Playlist a")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
