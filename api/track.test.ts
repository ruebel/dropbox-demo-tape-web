import { Dropbox, DropboxResponseError } from "dropbox";
import { afterEach, describe, expect, it, vi } from "vitest";

import { findFilesByName, getTrackLink } from "@/api/track";
import { FileMeta, PlaylistTrack } from "@/utils/types";

const filesGetTemporaryLink = vi.fn();
const filesSearchV2 = vi.fn();
const dbx = { filesGetTemporaryLink, filesSearchV2 } as unknown as Dropbox;

const track = {
  id: "id:abc123",
  name: "Song.mp3",
  path_lower: "/demos/song.mp3",
} as PlaylistTrack;

function linkResult(path: string) {
  return {
    result: {
      link: `https://dl.dropbox.test${path}`,
      metadata: { id: track.id, name: "Song.mp3", path_lower: path },
    },
  };
}

function notFound() {
  return new DropboxResponseError(409, {}, { error_summary: "path/not_found/.." });
}

describe("getTrackLink", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("gets the link by the saved path", async () => {
    filesGetTemporaryLink.mockResolvedValue(linkResult("/demos/song.mp3"));

    const result = await getTrackLink(dbx, track);

    expect(result.link).toBe("https://dl.dropbox.test/demos/song.mp3");
    expect(filesGetTemporaryLink).toHaveBeenCalledTimes(1);
    expect(filesGetTemporaryLink).toHaveBeenCalledWith({ path: "/demos/song.mp3" });
  });

  it("finds a moved file by its id", async () => {
    filesGetTemporaryLink
      .mockRejectedValueOnce(notFound())
      .mockResolvedValueOnce(linkResult("/archive/song.mp3"));

    const result = await getTrackLink(dbx, track);

    expect(filesGetTemporaryLink).toHaveBeenLastCalledWith({ path: "id:abc123" });
    expect(result.metadata.path_lower).toBe("/archive/song.mp3");
  });

  it("throws when the file is not found by id either", async () => {
    filesGetTemporaryLink
      .mockRejectedValueOnce(notFound())
      .mockRejectedValueOnce(notFound());

    await expect(getTrackLink(dbx, track)).rejects.toBeInstanceOf(
      DropboxResponseError
    );
    expect(filesGetTemporaryLink).toHaveBeenCalledTimes(2);
  });

  it("does not retry other errors", async () => {
    filesGetTemporaryLink.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(getTrackLink(dbx, track)).rejects.toBeInstanceOf(TypeError);
    expect(filesGetTemporaryLink).toHaveBeenCalledTimes(1);
  });
});

describe("findFilesByName", () => {
  const SHARED_FOLDER = "12889118";

  function file(
    path: string,
    { modified = "2026-10-01T12:00:00Z", sharedFolder = "" } = {}
  ) {
    return {
      ".tag": "file",
      id: `id:${path}`,
      name: path.split("/").pop(),
      path_lower: path.toLowerCase(),
      server_modified: modified,
      ...(sharedFolder && {
        sharing_info: { parent_shared_folder_id: sharedFolder, read_only: false },
      }),
    } as FileMeta;
  }

  function searchResult(files: FileMeta[]) {
    return {
      result: {
        has_more: false,
        matches: files.map((metadata) => ({
          metadata: { ".tag": "metadata", metadata },
        })),
      },
    };
  }

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("searches file names by the name without its extension", async () => {
    filesSearchV2.mockResolvedValue(searchResult([]));

    await findFilesByName(dbx, "Love So Big.mp3");

    expect(filesSearchV2).toHaveBeenCalledWith({
      query: "Love So Big",
      options: {
        file_extensions: ["mp3"],
        filename_only: true,
        max_results: 1000,
      },
    });
  });

  it("keeps only exact name matches, ignoring case", async () => {
    filesSearchV2.mockResolvedValue(
      searchResult([
        file("/Demos/love so big.mp3"),
        file("/Demos/Love So Big (live).mp3"),
        file("/Demos/Love So Big v2.mp3"),
      ])
    );

    const matches = await findFilesByName(dbx, "Love So Big.mp3");

    expect(matches.map((m) => m.path_lower)).toEqual(["/demos/love so big.mp3"]);
  });

  it("lists files in the shared folder first, then the newest first", async () => {
    filesSearchV2.mockResolvedValue(
      searchResult([
        file("/Private/old/Song.mp3", { modified: "2026-09-01T12:00:00Z" }),
        file("/Private/new/Song.mp3", { modified: "2026-11-01T12:00:00Z" }),
        file("/Band/old/Song.mp3", {
          modified: "2026-08-01T12:00:00Z",
          sharedFolder: SHARED_FOLDER,
        }),
        file("/Band/new/Song.mp3", {
          modified: "2026-10-01T12:00:00Z",
          sharedFolder: SHARED_FOLDER,
        }),
        file("/Other share/Song.mp3", {
          modified: "2026-11-02T12:00:00Z",
          sharedFolder: "999",
        }),
      ])
    );

    const matches = await findFilesByName(dbx, "Song.mp3", SHARED_FOLDER);

    expect(matches.map((m) => m.path_lower)).toEqual([
      "/band/new/song.mp3",
      "/band/old/song.mp3",
      "/other share/song.mp3",
      "/private/new/song.mp3",
      "/private/old/song.mp3",
    ]);
  });
});
