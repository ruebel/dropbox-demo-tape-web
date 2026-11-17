import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Dropbox } from "dropbox";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlaylistImage } from "@/components/PlaylistImage/PlaylistImage";
import { logError } from "@/hooks/useErrorTracking";
import { dbxAtom, isAuthenticatedAtom } from "@/state/dropbox";
import { imageMapAtom } from "@/state/image";
import { Playlist } from "@/utils/types";

vi.mock("@/hooks/useErrorTracking", () => ({ logError: vi.fn() }));

const FALLBACK_IMAGE = "/android-icon-96x96.png";
const CACHED_URL = "https://dl.dropbox.test/cached.jpg";
const FRESH_URL = "https://dl.dropbox.test/fresh.jpg";

const filesGetTemporaryLink = vi.fn();

function makePlaylist(id: string) {
  return {
    data: {
      artist: "Artist",
      image: { id: `image-${id}`, path_lower: `/demos/${id}.jpg` },
      title: `Playlist ${id}`,
      tracks: [],
    },
    meta: { id },
  } as unknown as Playlist;
}

function renderImage(playlist: Playlist, imageMap: Record<string, string> = {}) {
  const store = createStore();
  store.set(isAuthenticatedAtom, true);
  store.set(dbxAtom, { filesGetTemporaryLink } as unknown as Dropbox);
  store.set(imageMapAtom, imageMap);
  const view = render(
    <Provider store={store}>
      <PlaylistImage playlist={playlist} />
    </Provider>
  );
  return {
    rerender: (next: Playlist) =>
      view.rerender(
        <Provider store={store}>
          <PlaylistImage playlist={next} />
        </Provider>
      ),
  };
}

function image() {
  return screen.getByRole("img") as HTMLImageElement;
}

describe("PlaylistImage", () => {
  beforeEach(() => {
    localStorage.clear();
    filesGetTemporaryLink.mockResolvedValue({ result: { link: FRESH_URL } });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("fetches a fresh link when the cached link fails", async () => {
    renderImage(makePlaylist("a"), { "image-a": CACHED_URL });
    expect(image().src).toBe(CACHED_URL);

    fireEvent.error(image());

    await waitFor(() => expect(image().src).toBe(FRESH_URL));
    expect(filesGetTemporaryLink).toHaveBeenCalledTimes(1);
  });

  it("shows the fallback icon when a fresh link fails", async () => {
    renderImage(makePlaylist("a"));
    await waitFor(() => expect(image().src).toBe(FRESH_URL));

    fireEvent.error(image());

    expect(image().getAttribute("src")).toBe(FALLBACK_IMAGE);
    expect(filesGetTemporaryLink).toHaveBeenCalledTimes(1);
  });

  it("does not retry when the fallback icon fails", async () => {
    renderImage(makePlaylist("a"));
    await waitFor(() => expect(image().src).toBe(FRESH_URL));
    fireEvent.error(image());

    fireEvent.error(image());

    expect(image().getAttribute("src")).toBe(FALLBACK_IMAGE);
    expect(filesGetTemporaryLink).toHaveBeenCalledTimes(1);
  });

  it("fetches a fresh link when another playlist's cached link fails", async () => {
    const { rerender } = renderImage(makePlaylist("a"), {
      "image-b": CACHED_URL,
    });
    await waitFor(() => expect(image().src).toBe(FRESH_URL));

    const otherUrl = "https://dl.dropbox.test/other.jpg";
    filesGetTemporaryLink.mockResolvedValue({ result: { link: otherUrl } });
    rerender(makePlaylist("b"));
    expect(image().src).toBe(CACHED_URL);

    fireEvent.error(image());

    await waitFor(() => expect(image().src).toBe(otherUrl));
  });

  it("shows the fallback icon and logs when the link request fails", async () => {
    filesGetTemporaryLink.mockRejectedValue(new Error("path/not_found"));

    renderImage(makePlaylist("a"));

    await waitFor(() => expect(logError).toHaveBeenCalledTimes(1));
    expect(image().getAttribute("src")).toBe(FALLBACK_IMAGE);
  });
});
