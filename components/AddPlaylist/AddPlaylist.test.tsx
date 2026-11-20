import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
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
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/api/file", () => ({ uploadFile: vi.fn() }));
vi.mock("@/api/folder", () => ({ getFolder: vi.fn() }));
// Needs Dropbox to list folders
vi.mock("@/components/Explorer/Explorer", () => ({
  Explorer: ({ onPathChange }: { onPathChange: (path: string) => void }) => {
    explorer.onPathChange = onPathChange;
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
      folder: { id: "id:band", path: "/Demos/Band", sort: "name" },
      title: "Band",
      tracks: [],
    });
    expect(store.get(playlistsAtom)[0].data).toEqual(saved);
    expect(push).toHaveBeenCalledWith("/playlist/id%3Atape");
  });
});
