import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "@/api/file";
import { findFilesByName } from "@/api/track";
import { ReplaceTrack } from "@/components/ReplaceTrack/ReplaceTrack";
import { playlistsAtom } from "@/state/playlists";
import { transformFile } from "@/utils/file";
import { FileMeta, Playlist, PlaylistTrack } from "@/utils/types";

vi.mock("@/api/file", () => ({ uploadFile: vi.fn() }));
vi.mock("@/api/track", () => ({ findFilesByName: vi.fn() }));
vi.mock("@/hooks/useErrorTracking", () => ({ logError: vi.fn() }));

const SHARED_FOLDER = "12889118";

function file(path: string, sharedFolder = ""): FileMeta {
  return {
    ".tag": "file",
    id: `id:${path}`,
    name: path.split("/").pop() as string,
    path_display: path,
    path_lower: path.toLowerCase(),
    rev: "1",
    server_modified: "2026-11-01T12:00:00Z",
    ...(sharedFolder && {
      sharing_info: { parent_shared_folder_id: sharedFolder, read_only: false },
    }),
  } as FileMeta;
}

const playlistFile = file("/Band/Stuck In Heaven.mix", SHARED_FOLDER);

function makeTrack(path: string): PlaylistTrack {
  return transformFile(file(path, SHARED_FOLDER));
}

const missing: PlaylistTrack = {
  ...makeTrack("/Band/old/Love So Big.mp3"),
  duration: 168,
  error: "This file was moved or deleted in Dropbox",
  errorCode: "not_found",
};
const other = makeTrack("/Band/Ideas.mp3");

function renderReplaceTrack() {
  const playlist = {
    data: { artist: "Hunted Horse", title: "Stuck In Heaven", tracks: [other, missing] },
    meta: transformFile(playlistFile),
  } as Playlist;
  const store = createStore();
  store.set(playlistsAtom, [playlist]);

  render(
    <Provider store={store}>
      <ReplaceTrack playlist={playlist} track={missing} />
    </Provider>
  );
}

function lastUploadedTracks() {
  const calls = vi.mocked(uploadFile).mock.calls;
  return calls[calls.length - 1][1].tracks as PlaylistTrack[];
}

describe("ReplaceTrack", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(uploadFile).mockResolvedValue(playlistFile);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("searches only when asked, with the playlist's shared folder", async () => {
    vi.mocked(findFilesByName).mockResolvedValue([]);
    renderReplaceTrack();
    expect(findFilesByName).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "This file was moved or deleted in Dropbox"
    );

    fireEvent.click(screen.getByRole("button", { name: "Find file" }));

    await screen.findByText("No matching file found in Dropbox");
    expect(findFilesByName).toHaveBeenCalledWith(
      expect.anything(),
      "Love So Big.mp3",
      SHARED_FOLDER
    );
    expect(screen.getByRole("button", { name: "Remove track" })).toBeTruthy();
  });

  it("lists matches and labels files outside the shared folder", async () => {
    vi.mocked(findFilesByName).mockResolvedValue([
      file("/Band/new/Love So Big.mp3", SHARED_FOLDER),
      file("/Private/Love So Big.mp3"),
    ]);
    renderReplaceTrack();

    fireEvent.click(screen.getByRole("button", { name: "Find file" }));

    await screen.findByText("/Band/new");
    expect(screen.getByText("/Private")).toBeTruthy();
    expect(screen.getAllByText(/Only you can access this file/)).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Use this file" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Remove track" })).toBeTruthy();
  });

  it("replaces the track in place with a fresh entry", async () => {
    vi.mocked(findFilesByName).mockResolvedValue([
      file("/Band/new/Love So Big.mp3", SHARED_FOLDER),
    ]);
    renderReplaceTrack();
    fireEvent.click(screen.getByRole("button", { name: "Find file" }));

    fireEvent.click(await screen.findByRole("button", { name: "Use this file" }));

    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(1));
    const [first, second] = lastUploadedTracks();
    expect(first.id).toBe(other.id);
    expect(second.path_lower).toBe("/band/new/love so big.mp3");
    expect(second.error).toBeUndefined();
    expect(second.errorCode).toBeUndefined();
    expect(second.duration).toBeUndefined();
  });

  it("removes the track after a confirming second click", async () => {
    renderReplaceTrack();

    fireEvent.click(screen.getByRole("button", { name: "Remove track" }));
    expect(uploadFile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Really remove?" }));

    await vi.waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(1));
    expect(lastUploadedTracks().map((t) => t.id)).toEqual([other.id]);
  });

  it("offers to try again when the search fails", async () => {
    vi.mocked(findFilesByName)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce([]);
    renderReplaceTrack();

    fireEvent.click(screen.getByRole("button", { name: "Find file" }));
    await screen.findByText("Couldn't search Dropbox.");

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("No matching file found in Dropbox");
  });

  it("says so when the save fails", async () => {
    vi.mocked(uploadFile).mockRejectedValue(new TypeError("Failed to fetch"));
    renderReplaceTrack();

    fireEvent.click(screen.getByRole("button", { name: "Remove track" }));
    fireEvent.click(screen.getByRole("button", { name: "Really remove?" }));

    await screen.findByText("Couldn't save the playlist.");
  });
});
