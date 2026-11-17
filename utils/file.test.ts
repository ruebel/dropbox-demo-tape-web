import { describe, expect, it } from "vitest";

import {
  getImageMimeType,
  transformFile,
  updateTrackMeta,
} from "@/utils/file";
import { FileMeta, PlaylistTrack } from "@/utils/types";

const meta = {
  id: "id:abc123",
  name: "Song.mp3",
  path_display: "/Demos/Song.mp3",
  path_lower: "/demos/song.mp3",
  rev: "1",
  server_modified: "2026-10-01T12:00:00Z",
} as FileMeta;

const track: PlaylistTrack = {
  ...transformFile({ ...meta, ".tag": "file" }),
  duration: 192,
};

describe("updateTrackMeta", () => {
  it("returns undefined when nothing changed and there is no error", () => {
    expect(updateTrackMeta(track, meta)).toBeUndefined();
  });

  it("saves the new path of a moved file", () => {
    const moved = {
      ...meta,
      path_display: "/Archive/Song.mp3",
      path_lower: "/archive/song.mp3",
    };

    const updated = updateTrackMeta(track, moved);

    expect(updated?.path_lower).toBe("/archive/song.mp3");
    expect(updated?.path).toBe("/Archive/Song.mp3");
    expect(updated?.duration).toBe(192);
  });

  it("saves a new rev", () => {
    const updated = updateTrackMeta(track, { ...meta, rev: "2" });

    expect(updated?.rev).toBe("2");
  });

  it("clears an error when nothing else changed", () => {
    const updated = updateTrackMeta(
      {
        ...track,
        error: "This file was moved or deleted in Dropbox",
        errorCode: "not_found",
      },
      meta
    );

    expect(updated).toBeDefined();
    expect(updated?.error).toBeUndefined();
    expect(updated?.errorCode).toBeUndefined();
  });
});

describe("getImageMimeType", () => {
  it("returns the type for each playlist image extension", () => {
    expect(getImageMimeType("cover.jpg")).toBe("image/jpeg");
    expect(getImageMimeType("cover.jpeg")).toBe("image/jpeg");
    expect(getImageMimeType("cover.png")).toBe("image/png");
  });

  it("ignores the case of the extension", () => {
    expect(getImageMimeType("COVER.JPG")).toBe("image/jpeg");
  });

  it("returns undefined for other files", () => {
    expect(getImageMimeType("cover.gif")).toBeUndefined();
    expect(getImageMimeType("song.mp3")).toBeUndefined();
  });
});
