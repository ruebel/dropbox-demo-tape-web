import { act, cleanup, render } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ImageExplorer } from "@/components/ImageExplorer/ImageExplorer";
import { playlistsAtom } from "@/state/playlists";
import { transformFile } from "@/utils/file";
import { EnhancedFileMeta, FileMeta, Playlist } from "@/utils/types";

// The props the page passed to the Explorer
const explorer = vi.hoisted(() => ({
  selectedEntries: null as EnhancedFileMeta[] | null,
  singleSelection: undefined as boolean | undefined,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/api/file", () => ({ uploadFile: vi.fn() }));
// Not under test, and they need Dropbox
vi.mock("@/components/PlaylistHeader/PlaylistHeader", () => ({
  PlaylistHeader: () => null,
}));
vi.mock("@/components/Explorer/Explorer", () => ({
  Explorer: ({
    selectedEntries,
    singleSelection,
  }: {
    selectedEntries: EnhancedFileMeta[];
    singleSelection?: boolean;
  }) => {
    explorer.selectedEntries = selectedEntries;
    explorer.singleSelection = singleSelection;
    return null;
  },
}));

function file(path: string) {
  return transformFile({
    ".tag": "file",
    id: `id:${path}`,
    name: path.split("/").pop(),
    path_display: path,
    path_lower: path.toLowerCase(),
  } as FileMeta);
}

const playlistFile = file("/Band/Tape.mix");
const image = file("/Band/Cover.jpg");

describe("ImageExplorer", () => {
  beforeEach(() => {
    localStorage.clear();
    explorer.selectedEntries = null;
    explorer.singleSelection = undefined;
  });

  afterEach(cleanup);

  it("selects the saved image once the cache loads after a reload", () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <ImageExplorer id={playlistFile.id} />
      </Provider>
    );
    expect(explorer.selectedEntries).toBeNull();

    act(() =>
      store.set(playlistsAtom, [
        {
          data: { artist: "Artist", image, title: "Tape", tracks: [] },
          meta: playlistFile,
        } as Playlist,
      ])
    );

    expect(explorer.selectedEntries).toEqual([image]);
  });

  it("lets a click on another image replace the selected one", () => {
    const store = createStore();
    store.set(playlistsAtom, [
      {
        data: { artist: "Artist", image, title: "Tape", tracks: [] },
        meta: playlistFile,
      } as Playlist,
    ]);
    render(
      <Provider store={store}>
        <ImageExplorer id={playlistFile.id} />
      </Provider>
    );

    expect(explorer.singleSelection).toBe(true);
  });
});
