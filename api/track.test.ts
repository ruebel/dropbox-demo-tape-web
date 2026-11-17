import { Dropbox, DropboxResponseError } from "dropbox";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getTrackLink } from "@/api/track";
import { PlaylistTrack } from "@/utils/types";

const filesGetTemporaryLink = vi.fn();
const dbx = { filesGetTemporaryLink } as unknown as Dropbox;

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
