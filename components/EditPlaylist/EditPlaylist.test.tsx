import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "@/api/file";
import { listFolderAudioFiles } from "@/api/folder";
import { EditableTrack } from "@/components/EditPlaylist/EditableTrack";
import { EditPlaylist } from "@/components/EditPlaylist/EditPlaylist";
import type { EditableTrackList } from "@/components/EditPlaylist/EditableTrackList";
import {
  playlistsAtom,
  updatePlaylistAtom,
  updatePlaylistTrackAtom,
} from "@/state/playlists";
import { transformFile } from "@/utils/file";
import { FileMeta, Playlist, PlaylistData } from "@/utils/types";

const push = vi.fn();

// The props of the last track list the page rendered
const trackList = vi.hoisted(() => ({
  props: null as ComponentProps<typeof EditableTrackList> | null,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/api/file", () => ({ uploadFile: vi.fn() }));
vi.mock("@/api/folder", () => ({
  listFolderAudioFiles: vi.fn(),
  watchFolder: vi.fn(),
}));
// Not under test, and they need Dropbox and drag-and-drop setup
vi.mock("@/components/PlaylistImage/PlaylistImage", () => ({
  PlaylistImage: () => null,
}));
vi.mock("@/components/EditPlaylist/EditableTrackList", () => ({
  EditableTrackList: (props: ComponentProps<typeof EditableTrackList>) => {
    trackList.props = props;
    return null;
  },
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

  it("fills the form after a reload and keeps the playlist on save", async () => {
    // After a reload the page renders before the cache loads
    const store = createStore();
    render(
      <Provider store={store}>
        <EditPlaylist id={playlistFile.id} />
      </Provider>
    );
    expect(screen.queryByLabelText("Title")).toBeNull();

    act(() =>
      store.set(playlistsAtom, [
        {
          data: {
            artist: "Hunted Horse",
            title: "Stuck In Heaven",
            tracks: [track],
          },
          meta: transformFile(playlistFile),
        } as Playlist,
      ])
    );

    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
      "Stuck In Heaven"
    );
    expect((screen.getByLabelText("Artist") as HTMLInputElement).value).toBe(
      "Hunted Horse"
    );
    expect(trackList.props?.tracks).toEqual([track]);

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Stuck In Heaven (v2)" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalled());
    const saved: PlaylistData = vi.mocked(uploadFile).mock.lastCall![1];
    expect(saved.artist).toBe("Hunted Horse");
    expect(saved.tracks.map((t) => t.id)).toEqual([track.id]);
  });
});

describe("EditPlaylist for a folder playlist", () => {
  const a = transformFile(file("/Band/a.mp3"));
  const b = transformFile(file("/Band/b.mp3"));
  const c = transformFile(file("/Band/c.mp3"));

  function renderFolderPlaylist(
    sort: "name" | "custom" = "name",
    { includeSubfolders = undefined as boolean | undefined, tracks = [a, b] } = {}
  ) {
    const store = createStore();
    store.set(playlistsAtom, [
      {
        data: {
          artist: "Hunted Horse",
          folder: { id: "id:band", includeSubfolders, path: "/Band", sort },
          title: "Band",
          tracks,
        },
        meta: transformFile(playlistFile),
      } as Playlist,
    ]);
    render(
      <Provider store={store}>
        <EditPlaylist id={playlistFile.id} />
      </Provider>
    );
    return store;
  }

  // Like a sync that finds a new file while the page is open
  async function addTrackFromSync(store: ReturnType<typeof createStore>) {
    await store.set(updatePlaylistAtom, {
      playlistId: playlistFile.id,
      update: (p) => ({
        ...p,
        data: { ...p.data, tracks: [...p.data.tracks, c] },
      }),
    });
  }

  async function save(): Promise<PlaylistData> {
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await vi.waitFor(() => expect(push).toHaveBeenCalled());
    return vi.mocked(uploadFile).mock.lastCall![1];
  }

  beforeEach(() => {
    localStorage.clear();
    trackList.props = null;
    vi.mocked(uploadFile).mockResolvedValue(playlistFile);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the folder and hides the controls that pick tracks", () => {
    renderFolderPlaylist();

    expect(screen.getByText("/Band").parentElement?.textContent).toBe(
      "Synced with /Band"
    );
    expect(screen.getByText("Drag tracks to change their order.")).toBeTruthy();
    expect(screen.queryByText("Edit Tracks")).toBeNull();
    expect(trackList.props?.canDelete).toBe(false);
  });

  it("disables Sort A–Z while the tracks are in name order", () => {
    renderFolderPlaylist("name");

    const button = screen.getByRole("button", { name: "Sort A–Z" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("saves a dragged order as custom and keeps files a sync added", async () => {
    const store = renderFolderPlaylist("name");

    act(() => trackList.props!.onTrackChange([b, a]));
    await addTrackFromSync(store);
    const saved = await save();

    expect(saved.folder?.sort).toBe("custom");
    expect(saved.tracks.map((t) => t.name)).toEqual(["b.mp3", "a.mp3", "c.mp3"]);
  });

  it("saves name order after Sort A–Z, with files a sync added in place", async () => {
    const store = createStore();
    store.set(playlistsAtom, [
      {
        data: {
          artist: "Hunted Horse",
          folder: { id: "id:band", path: "/Band", sort: "custom" },
          title: "Band",
          tracks: [c, a],
        },
        meta: transformFile(playlistFile),
      } as Playlist,
    ]);
    render(
      <Provider store={store}>
        <EditPlaylist id={playlistFile.id} />
      </Provider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Sort A–Z" }));
    expect(trackList.props?.tracks.map((t) => t.name)).toEqual([
      "a.mp3",
      "c.mp3",
    ]);

    // A sync adds b while the page is open
    await store.set(updatePlaylistAtom, {
      playlistId: playlistFile.id,
      update: (p) => ({
        ...p,
        data: { ...p.data, tracks: [...p.data.tracks, b] },
      }),
    });
    const saved = await save();

    expect(saved.folder?.sort).toBe("name");
    expect(saved.tracks.map((t) => t.name)).toEqual(["a.mp3", "b.mp3", "c.mp3"]);
  });

  it("keeps a sync's changes when only the title changed", async () => {
    const store = renderFolderPlaylist("name");

    await addTrackFromSync(store);
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Band (v2)" },
    });
    const saved = await save();

    expect(saved.title).toBe("Band (v2)");
    expect(saved.folder).toEqual({
      id: "id:band",
      includeSubfolders: false,
      path: "/Band",
      sort: "name",
    });
    expect(saved.tracks.map((t) => t.name)).toEqual(["a.mp3", "b.mp3", "c.mp3"]);
  });

  describe("when the subfolder option changes", () => {
    const live = file("/Band/Live/b.mp3");

    function checkbox() {
      return screen.getByLabelText("Include subfolders") as HTMLInputElement;
    }

    function shownPaths() {
      return trackList.props?.tracks.map((t) => t.path);
    }

    function isDisabled(name: string) {
      return (screen.getByRole("button", { name }) as HTMLButtonElement)
        .disabled;
    }

    // A listing that finishes when the test calls `finish`
    function pendingListing(files: FileMeta[]) {
      let finish = () => {};
      vi.mocked(listFolderAudioFiles).mockReturnValueOnce(
        new Promise((resolve) => {
          finish = () => resolve({ cursor: "c1", files });
        })
      );
      return { finish: () => act(async () => finish()) };
    }

    it("lists subfolders and shows their tracks when checked", async () => {
      vi.mocked(listFolderAudioFiles).mockResolvedValueOnce({
        cursor: "c1",
        files: [a, b, live],
      });
      renderFolderPlaylist("name");
      expect(checkbox().checked).toBe(false);

      await act(async () => fireEvent.click(checkbox()));

      expect(listFolderAudioFiles).toHaveBeenCalledWith(
        expect.anything(),
        "id:band",
        { recursive: true }
      );
      expect(checkbox().checked).toBe(true);
      expect(shownPaths()).toEqual([
        "/Band/a.mp3",
        "/Band/b.mp3",
        "/Band/Live/b.mp3",
      ]);
      expect(isDisabled("Save")).toBe(false);
    });

    it("removes the subfolder tracks when unchecked", async () => {
      vi.mocked(listFolderAudioFiles).mockResolvedValueOnce({
        cursor: "c1",
        files: [a, b],
      });
      renderFolderPlaylist("name", {
        includeSubfolders: true,
        tracks: [a, b, transformFile(live)],
      });

      await act(async () => fireEvent.click(checkbox()));

      expect(listFolderAudioFiles).toHaveBeenCalledWith(
        expect.anything(),
        "id:band",
        { recursive: false }
      );
      expect(shownPaths()).toEqual(["/Band/a.mp3", "/Band/b.mp3"]);
    });

    it("disables the controls until the listing finishes", async () => {
      const listing = pendingListing([a, b, live]);
      renderFolderPlaylist("custom");

      fireEvent.click(checkbox());

      expect(checkbox().disabled).toBe(true);
      expect(isDisabled("Save")).toBe(true);
      expect(isDisabled("Sort A–Z")).toBe(true);

      await listing.finish();

      expect(checkbox().disabled).toBe(false);
      expect(isDisabled("Save")).toBe(false);
      expect(isDisabled("Sort A–Z")).toBe(false);
    });

    it("keeps a drag made during the listing", async () => {
      const listing = pendingListing([a, b, live]);
      renderFolderPlaylist("name");

      fireEvent.click(checkbox());
      act(() => trackList.props!.onTrackChange([b, a]));
      await listing.finish();

      expect(shownPaths()).toEqual([
        "/Band/b.mp3",
        "/Band/a.mp3",
        "/Band/Live/b.mp3",
      ]);
    });

    it("puts the box back and shows an error when the listing fails", async () => {
      vi.mocked(listFolderAudioFiles).mockRejectedValueOnce(
        new TypeError("Failed to fetch")
      );
      renderFolderPlaylist("name");

      await act(async () => fireEvent.click(checkbox()));

      expect(checkbox().checked).toBe(false);
      expect(screen.getByRole("alert").textContent).toMatch(
        /Check your connection/
      );
      expect(shownPaths()).toEqual(["/Band/a.mp3", "/Band/b.mp3"]);
      expect(isDisabled("Save")).toBe(true);
    });

    it("saves the listed tracks in the order the user dragged them", async () => {
      vi.mocked(listFolderAudioFiles).mockResolvedValueOnce({
        cursor: "c1",
        files: [a, b, live],
      });
      const store = renderFolderPlaylist("name");
      // The player saves a's duration while the page is open
      await store.set(updatePlaylistTrackAtom, {
        playlistId: playlistFile.id,
        trackId: a.id,
        update: (t) => ({ ...t, duration: 168 }),
      });

      await act(async () => fireEvent.click(checkbox()));
      const [listedA, listedB, listedLive] = trackList.props!.tracks;
      act(() =>
        trackList.props!.onTrackChange([listedLive, listedA, listedB])
      );
      const saved = await save();

      expect(saved.folder).toEqual({
        id: "id:band",
        includeSubfolders: true,
        path: "/Band",
        sort: "custom",
      });
      expect(saved.tracks.map((t) => t.path)).toEqual([
        "/Band/Live/b.mp3",
        "/Band/a.mp3",
        "/Band/b.mp3",
      ]);
      expect(saved.tracks[1].duration).toBe(168);
    });
  });
});

describe("EditableTrack", () => {
  const track = transformFile(file("/Band/a.mp3"));

  afterEach(() => {
    cleanup();
  });

  it("shows the remove button when it can delete", () => {
    render(<EditableTrack index={1} onDelete={vi.fn()} track={track} />);

    expect(screen.getByRole("button", { name: "Remove track" })).toBeTruthy();
  });

  it("hides the remove button when it cannot delete", () => {
    render(<EditableTrack index={1} track={track} />);

    expect(screen.queryByRole("button", { name: "Remove track" })).toBeNull();
  });

  it("shows the folder under the title", () => {
    render(<EditableTrack folder="/Band/Live" index={1} track={track} />);

    expect(document.querySelector("[class*=folder]")?.textContent).toBe(
      "/Band/Live"
    );
  });

  it("shows no folder when it has none", () => {
    render(<EditableTrack index={1} track={track} />);

    expect(document.querySelector("[class*=folder]")).toBeNull();
  });
});
