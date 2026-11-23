import { act, cleanup, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LoadedPlaylist } from "@/components/LoadedPlaylist/LoadedPlaylist";
import { rootStorageAtom } from "@/state/dropbox";
import { isSyncingPlaylistsAtom, playlistsAtom } from "@/state/playlists";
import { transformFile } from "@/utils/file";
import { FileMeta, Playlist } from "@/utils/types";

const meta = transformFile({
  ".tag": "file",
  id: "id:tape",
  name: "Tape.mix",
  path_display: "/Demos/Tape.mix",
  path_lower: "/demos/tape.mix",
} as FileMeta);

function makePlaylist(title: string) {
  return {
    data: { artist: "Artist", title, tracks: [] },
    meta,
  } as Playlist;
}

function renderLoaded(store: ReturnType<typeof createStore>) {
  return render(
    <Provider store={store}>
      <LoadedPlaylist id="id:tape">
        {(playlist) => <h1>{playlist.data.title}</h1>}
      </LoadedPlaylist>
    </Provider>
  );
}

function hasProgress(container: HTMLElement) {
  return !!container.querySelector("[class*=progress]");
}

describe("LoadedPlaylist", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(cleanup);

  it("shows progress until the cache loads, then the playlist", () => {
    const store = createStore();
    const { container } = renderLoaded(store);

    expect(hasProgress(container)).toBe(true);
    expect(screen.queryByRole("heading")).toBeNull();

    act(() => store.set(playlistsAtom, [makePlaylist("Tape")]));

    expect(hasProgress(container)).toBe(false);
    expect(screen.getByRole("heading").textContent).toBe("Tape");
  });

  it("shows progress while the playlists download", () => {
    const store = createStore();
    store.set(rootStorageAtom, {});
    store.set(isSyncingPlaylistsAtom, true);

    const { container } = renderLoaded(store);

    expect(hasProgress(container)).toBe(true);
  });

  it("shows nothing for a playlist that does not exist", () => {
    const store = createStore();
    store.set(rootStorageAtom, {});

    const { container } = renderLoaded(store);

    expect(container.innerHTML).toBe("");
  });

  it("passes the latest playlist each time it changes", () => {
    const store = createStore();
    store.set(playlistsAtom, [makePlaylist("Tape")]);
    renderLoaded(store);

    act(() => store.set(playlistsAtom, [makePlaylist("Tape (v2)")]));

    expect(screen.getByRole("heading").textContent).toBe("Tape (v2)");
  });
});
