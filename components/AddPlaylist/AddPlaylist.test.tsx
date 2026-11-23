import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { DropboxResponseError } from "dropbox";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "@/api/file";
import { getFolder } from "@/api/folder";
import { AddPlaylist } from "@/components/AddPlaylist/AddPlaylist";
import { playlistsAtom } from "@/state/playlists";
import { FileMeta, PlaylistData } from "@/utils/types";

const push = vi.fn();

// The folder change handler the page passed to the Explorer
const explorer = vi.hoisted(() => ({
  onPathChange: null as ((path: string) => void) | null,
  previewFiles: undefined as boolean | undefined,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/api/file", () => ({ uploadFile: vi.fn() }));
vi.mock("@/api/folder", () => ({ getFolder: vi.fn() }));
// Needs Dropbox to list folders
vi.mock("@/components/Explorer/Explorer", () => ({
  Explorer: ({
    onPathChange,
    previewFiles,
  }: {
    onPathChange: (path: string) => void;
    previewFiles?: boolean;
  }) => {
    explorer.onPathChange = onPathChange;
    explorer.previewFiles = previewFiles;
    return null;
  },
}));

const savedFile = {
  ".tag": "file",
  id: "id:tape",
  name: "Band.mix",
  path_display: "/Demos/Band/Band.mix",
  path_lower: "/demos/band/band.mix",
  rev: "1",
  server_modified: "2026-10-01T12:00:00Z",
} as FileMeta;

function renderPage() {
  const store = createStore();
  render(
    <Provider store={store}>
      <AddPlaylist />
    </Provider>
  );
  return store;
}

function openFolder(path: string) {
  act(() => explorer.onPathChange!(path));
}

function titleInput() {
  return screen.getByLabelText("Title") as HTMLInputElement;
}

function saveButton() {
  return screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
}

function fillIn(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function chooseFolderType() {
  fireEvent.click(screen.getByLabelText("Sync a folder"));
}

async function save(): Promise<PlaylistData> {
  fireEvent.click(saveButton());
  await vi.waitFor(() => expect(push).toHaveBeenCalled());
  return vi.mocked(uploadFile).mock.lastCall![1];
}

describe("AddPlaylist", () => {
  beforeEach(() => {
    localStorage.clear();
    explorer.onPathChange = null;
    vi.mocked(uploadFile).mockResolvedValue(savedFile);
    vi.mocked(getFolder).mockResolvedValue({
      id: "id:band",
      path: "/Demos/Band",
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("starts as a playlist with picked tracks", () => {
    renderPage();

    expect(
      (screen.getByLabelText("Pick tracks") as HTMLInputElement).checked
    ).toBe(true);
    expect(screen.getByText("Location")).toBeTruthy();
  });

  it("shows the audio files in the open folder for both playlist types", () => {
    renderPage();
    expect(explorer.previewFiles).toBe(true);

    chooseFolderType();
    expect(explorer.previewFiles).toBe(true);
  });

  it("saves a playlist with picked tracks without a folder", async () => {
    renderPage();
    openFolder("/Demos");
    fillIn("Title", "Mix");
    fillIn("Artist", "Hunted Horse");

    const saved = await save();

    expect(vi.mocked(uploadFile).mock.lastCall![2]).toBe("/Demos/Mix.mix");
    expect(saved).toEqual({ artist: "Hunted Horse", title: "Mix", tracks: [] });
    expect(getFolder).not.toHaveBeenCalled();
  });

  it("saves a playlist with picked tracks in the home folder", async () => {
    renderPage();
    fillIn("Title", "Mix");
    fillIn("Artist", "Hunted Horse");

    await save();

    expect(vi.mocked(uploadFile).mock.lastCall![2]).toBe("/Mix.mix");
  });

  it("saves in the home folder after going back to it", async () => {
    renderPage();
    openFolder("/Demos");
    openFolder("");
    fillIn("Title", "Mix");
    fillIn("Artist", "Hunted Horse");

    await save();

    expect(vi.mocked(uploadFile).mock.lastCall![2]).toBe("/Mix.mix");
  });

  it("names a folder playlist after the open folder", () => {
    renderPage();
    chooseFolderType();

    openFolder("/Demos");
    expect(titleInput().value).toBe("Demos");

    openFolder("/Demos/Band");
    expect(titleInput().value).toBe("Band");
    expect(screen.getByText("Folder")).toBeTruthy();
  });

  it("keeps a typed title when the folder changes", () => {
    renderPage();
    chooseFolderType();
    openFolder("/Demos");

    fillIn("Title", "My Tape");
    openFolder("/Demos/Band");
    expect(titleInput().value).toBe("My Tape");

    // Clearing the title names the playlist after the folder again
    fillIn("Title", "");
    expect(titleInput().value).toBe("Band");
  });

  it("does not save a folder playlist for the home folder", () => {
    renderPage();
    chooseFolderType();

    expect(saveButton().disabled).toBe(true);

    openFolder("/Demos");
    expect(saveButton().disabled).toBe(false);

    openFolder("");
    expect(saveButton().disabled).toBe(true);
  });

  it("saves a folder playlist inside its folder", async () => {
    const store = renderPage();
    chooseFolderType();
    openFolder("/Demos/Band");
    fillIn("Artist", "Hunted Horse");

    const saved = await save();

    expect(getFolder).toHaveBeenCalledWith(expect.anything(), "/Demos/Band");
    expect(vi.mocked(uploadFile).mock.lastCall![2]).toBe(
      "/Demos/Band/Band.mix"
    );
    expect(saved).toEqual({
      artist: "Hunted Horse",
      folder: {
        id: "id:band",
        includeSubfolders: false,
        path: "/Demos/Band",
        sort: "name",
      },
      title: "Band",
      tracks: [],
    });
    expect(store.get(playlistsAtom)[0].data).toEqual(saved);
    expect(push).toHaveBeenCalledWith("/playlist/id%3Atape");
  });

  it("shows the subfolder option only for a folder playlist", () => {
    renderPage();
    expect(screen.queryByLabelText("Include subfolders")).toBeNull();

    chooseFolderType();
    expect(
      (screen.getByLabelText("Include subfolders") as HTMLInputElement).checked
    ).toBe(false);
  });

  it("saves a folder playlist that includes subfolders", async () => {
    renderPage();
    chooseFolderType();
    openFolder("/Demos/Band");
    fillIn("Artist", "Hunted Horse");
    fireEvent.click(screen.getByLabelText("Include subfolders"));

    const saved = await save();

    expect(saved.folder?.includeSubfolders).toBe(true);
  });

  describe("when a file with the same name is in the folder", () => {
    const TAKEN = 'A playlist named "Band" already exists in this folder.';

    beforeEach(() => {
      vi.mocked(uploadFile).mockRejectedValueOnce(
        new DropboxResponseError(409, {}, {
          error_summary: "path/conflict/file/..",
        })
      );
    });

    async function trySave(store = renderPage()) {
      chooseFolderType();
      openFolder("/Demos/Band");
      fillIn("Artist", "Hunted Horse");
      fireEvent.click(saveButton());
      await screen.findByText(TAKEN);
      return store;
    }

    it("does not replace the file and asks for another title", async () => {
      const store = await trySave();

      expect(vi.mocked(uploadFile).mock.lastCall![3]).toEqual({
        overwrite: false,
      });
      expect(push).not.toHaveBeenCalled();
      expect(store.get(playlistsAtom)).toEqual([]);
    });

    it("clears the error when the title changes", async () => {
      await trySave();

      fillIn("Title", "Band 2");

      expect(screen.queryByText(TAKEN)).toBeNull();
    });

    it("clears the error when the folder changes", async () => {
      await trySave();

      openFolder("/Demos");

      expect(screen.queryByText(TAKEN)).toBeNull();
    });

    it("saves with a new title", async () => {
      await trySave();

      fillIn("Title", "Band 2");
      const saved = await save();

      expect(saved.title).toBe("Band 2");
      expect(vi.mocked(uploadFile).mock.lastCall![2]).toBe(
        "/Demos/Band/Band 2.mix"
      );
    });
  });
});
