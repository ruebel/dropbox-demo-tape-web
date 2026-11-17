import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "@/api/file";
import { EditPlaylist } from "@/components/EditPlaylist/EditPlaylist";
import { playlistsAtom, updatePlaylistTrackAtom } from "@/state/playlists";
import { transformFile } from "@/utils/file";
import { FileMeta, Playlist, PlaylistData } from "@/utils/types";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/api/file", () => ({ uploadFile: vi.fn() }));
// Not under test, and they need Dropbox and drag-and-drop setup
vi.mock("@/components/PlaylistImage/PlaylistImage", () => ({
  PlaylistImage: () => null,
}));
vi.mock("@/components/EditPlaylist/EditableTrackList", () => ({
  EditableTrackList: () => null,
}));

function file(path: string) {
  return {
    ".tag": "file",
    id: `id:${path}`,
    name: path.split("/").pop(),
    path_display: path,
    path_lower: path.toLowerCase(),
    rev: "1",
    server_modified: "2026-10-01T12:00:00Z",
  } as FileMeta;
}

const playlistFile = file("/Band/Stuck In Heaven.mix");
const track = transformFile(file("/Band/Love So Big.mp3"));

describe("EditPlaylist", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(uploadFile).mockResolvedValue(playlistFile);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps a track change the player saved while the page was open", async () => {
    const store = createStore();
    store.set(playlistsAtom, [
      {
        data: { artist: "Hunted Horse", title: "Stuck In Heaven", tracks: [track] },
        meta: transformFile(playlistFile),
      } as Playlist,
    ]);
    render(
      <Provider store={store}>
        <EditPlaylist id={playlistFile.id} />
      </Provider>
    );

    // The player saves the track's duration after the page opened
    await store.set(updatePlaylistTrackAtom, {
      playlistId: playlistFile.id,
      trackId: track.id,
      update: (t) => ({ ...t, duration: 168 }),
    });

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Stuck In Heaven (v2)" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalled());
    const saved: PlaylistData = vi.mocked(uploadFile).mock.calls[1][1];
    expect(saved.title).toBe("Stuck In Heaven (v2)");
    expect(saved.tracks[0].duration).toBe(168);
  });
});
