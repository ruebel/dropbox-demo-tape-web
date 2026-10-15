import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider, useAtomValue } from "jotai";
import { StrictMode, Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchPlaylists } from "@/api/playlists";
import { useCacheSync } from "@/hooks/useCacheSync";
import { isAuthenticatedAtom } from "@/state/dropbox";
import { loadableDBPlaylists, playlistsAtom } from "@/state/playlists";
import { Playlist } from "@/utils/types";

vi.mock("@/api/playlists", () => ({ fetchPlaylists: vi.fn() }));
vi.mock("@/api/user", () => ({ getUsers: vi.fn().mockResolvedValue([]) }));

function makePlaylist(id: string) {
  return {
    data: { artist: "Artist", title: `Playlist ${id}`, tracks: [] },
    meta: { id, name: `${id}.mix` },
  } as unknown as Playlist;
}

// Mounts the cache sync effect, the way Header does
function CacheSync() {
  useCacheSync();
  return null;
}

// Reads the cached list and subscribes to the fetch, the way Playlists does
function PlaylistCount() {
  const playlists = useAtomValue(playlistsAtom);
  useAtomValue(loadableDBPlaylists);
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

describe("dbPlaylistAtomEffect", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(fetchPlaylists).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return [makePlaylist("a"), makePlaylist("b")];
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

    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("2")
    );
  });

  it("copies fetched playlists into an empty cache when already authenticated", async () => {
    const store = createStore();
    store.set(isAuthenticatedAtom, true);
    render(<App store={store} />);

    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("2")
    );
  });

  // Regression: jotai-effect 0.5 with jotai 2.20 stopped running the effect
  // after a remount while the fetch was loading, so the cache stayed empty
  it("copies fetched playlists after the effect remounts while the fetch is loading", async () => {
    const store = createStore();
    store.set(isAuthenticatedAtom, true);
    const { rerender } = render(<App cacheSyncKey={1} store={store} />);

    // Remount before the 50ms fetch resolves
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    rerender(<App cacheSyncKey={2} store={store} />);

    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("2")
    );
  });

  // atomWithStorage loads the cache on mount, after the first render
  it("shows cached playlists from storage before auth finishes", async () => {
    localStorage.setItem(
      "dt",
      JSON.stringify({ playlists: [makePlaylist("a"), makePlaylist("b")] })
    );
    const store = createStore();
    render(<App store={store} />);

    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("2")
    );
    expect(fetchPlaylists).not.toHaveBeenCalled();
  });
});
