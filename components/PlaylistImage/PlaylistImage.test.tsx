import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Dropbox } from "dropbox";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlaylistImage } from "@/components/PlaylistImage/PlaylistImage";
import { logError } from "@/hooks/useErrorTracking";
import { dbxAtom, isAuthenticatedAtom } from "@/state/dropbox";
import { imageMapAtom } from "@/state/image";
import { Playlist } from "@/utils/types";

vi.mock("@/hooks/useErrorTracking", () => ({ logError: vi.fn() }));

const FALLBACK_IMAGE = "/playlist-fallback.svg";
const CACHED_URL = "https://dl.dropbox.test/cached.jpg";
const FRESH_URL = "https://dl.dropbox.test/fresh.jpg";

const filesGetTemporaryLink = vi.fn();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  return screen.getByAltText(/^Playlist /) as HTMLImageElement;
}

// The tooltip that goes with the error badge. Returns null when there is no
// error, and checks that the image points to it when there is one.
function errorBadge() {
  const tooltip = screen.queryByRole("tooltip", { hidden: true });
  if (tooltip) {
    expect(tooltip.textContent).toBe("Couldn't load the playlist image");
    expect(image().getAttribute("aria-describedby")).toBe(tooltip.id);
  } else {
    expect(image().getAttribute("aria-describedby")).toBeNull();
  }
  return tooltip;
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
    expect(errorBadge()).toBeNull();
  });

  it("shows the fallback icon and an error badge when a fresh link fails", async () => {
    renderImage(makePlaylist("a"));
    await waitFor(() => expect(image().src).toBe(FRESH_URL));
    expect(errorBadge()).toBeNull();

    fireEvent.error(image());

    expect(image().getAttribute("src")).toBe(FALLBACK_IMAGE);
    expect(errorBadge()).not.toBeNull();
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

  it("shows the fallback icon and an error badge and logs when the link request fails", async () => {
    filesGetTemporaryLink.mockRejectedValue(new Error("path/not_found"));

    renderImage(makePlaylist("a"));

    await waitFor(() => expect(logError).toHaveBeenCalledTimes(1));
    expect(image().getAttribute("src")).toBe(FALLBACK_IMAGE);
    expect(errorBadge()).not.toBeNull();
  });

  it("shows the fallback icon without a badge when the playlist has no image", async () => {
    const playlist = makePlaylist("a");
    playlist.data.image = undefined;

    renderImage(playlist);

    await waitFor(() =>
      expect(image().getAttribute("src")).toBe(FALLBACK_IMAGE)
    );
    expect(errorBadge()).toBeNull();
    expect(filesGetTemporaryLink).not.toHaveBeenCalled();
  });

  it("stops fetching links when two copies of the same image are broken", async () => {
    // Each request returns a new temporary link, like Dropbox does
    let requests = 0;
    filesGetTemporaryLink.mockImplementation(async () => ({
      result: { link: `https://dl.dropbox.test/${++requests}.jpg` },
    }));
    const playlist = makePlaylist("a");
    const store = createStore();
    store.set(isAuthenticatedAtom, true);
    store.set(dbxAtom, { filesGetTemporaryLink } as unknown as Dropbox);
    store.set(imageMapAtom, {});
    // Like the playlist header and the player bar on a playlist page
    render(
      <Provider store={store}>
        <PlaylistImage playlist={playlist} />
        <PlaylistImage playlist={playlist} />
      </Provider>
    );

    // The file is not a loadable image, so every link fails to load
    for (let round = 0; round < 10; round++) {
      await act(() => sleep(5));
      for (const img of screen.getAllByAltText("Playlist a")) {
        if (img.getAttribute("src") !== FALLBACK_IMAGE) {
          fireEvent.error(img);
        }
      }
    }

    // One request per copy at most, then both give up
    expect(filesGetTemporaryLink.mock.calls.length).toBeLessThanOrEqual(2);
    for (const img of screen.getAllByAltText("Playlist a")) {
      expect(img.getAttribute("src")).toBe(FALLBACK_IMAGE);
    }
    expect(screen.getAllByRole("tooltip", { hidden: true })).toHaveLength(2);
  });
});
