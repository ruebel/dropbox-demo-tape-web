import { act, cleanup, render } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TrackExplorer } from "@/components/TrackExplorer/TrackExplorer";
import { playlistsAtom } from "@/state/playlists";
import { transformFile } from "@/utils/file";
import { EnhancedFileMeta, FileMeta, Playlist } from "@/utils/types";

// The tracks the page passed to the Explorer as selected
const explorer = vi.hoisted(() => ({
  selectedEntries: null as EnhancedFileMeta[] | null,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/api/file", () => ({ uploadFile: vi.fn() }));
// Not under test, and they need Dropbox
vi.mock("@/components/PlaylistHeader/PlaylistHeader", () => ({
  PlaylistHeader: () => null,
}));
vi.mock("@/components/Explorer/Explorer", () => ({
  Explorer: ({ selectedEntries }: { selectedEntries: EnhancedFileMeta[] }) => {
    explorer.selectedEntries = selectedEntries;
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
const track = file("/Band/Love So Big.mp3");

describe("TrackExplorer", () => {
  beforeEach(() => {
    localStorage.clear();
    explorer.selectedEntries = null;
  });

  afterEach(cleanup);

  it("selects the saved tracks once the cache loads after a reload", () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <TrackExplorer id={playlistFile.id} />
      </Provider>
    );
    expect(explorer.selectedEntries).toBeNull();

    act(() =>
      store.set(playlistsAtom, [
        {
          data: { artist: "Artist", title: "Tape", tracks: [track] },
          meta: playlistFile,
        } as Playlist,
      ])
    );

    expect(explorer.selectedEntries).toEqual([track]);
  });
});
