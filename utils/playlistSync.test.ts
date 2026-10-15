import { describe, expect, it } from "vitest";

import { transformFile } from "@/utils/file";
import { planPlaylistSync } from "@/utils/playlistSync";
import { FileMeta, Playlist } from "@/utils/types";

function makeFile(id: string, rev: string, path = `/Demos/${id}.mix`) {
  return {
    ".tag": "file",
    id,
    name: path.split("/").pop(),
    path_display: path,
    path_lower: path.toLowerCase(),
    rev,
    server_modified: `2026-10-0${rev}T12:00:00Z`,
  } as FileMeta;
}

function makePlaylist(file: FileMeta, title: string) {
  return {
    data: { artist: "Artist", title, tracks: [] },
    meta: transformFile(file),
  } as Playlist;
}

describe("planPlaylistSync", () => {
  it("reuses a cached playlist whose rev has not changed", () => {
    const file = makeFile("a", "1");
    const cached = makePlaylist(file, "Cached A");

    const { reused, toDownload } = planPlaylistSync([file], [cached]);

    expect(reused).toEqual([cached]);
    expect(toDownload).toEqual([]);
  });

  it("uses the fresh path for a renamed playlist it reuses", () => {
    const cached = makePlaylist(makeFile("a", "1"), "Cached A");
    const renamed = makeFile("a", "1", "/Demos/Renamed.mix");

    const { reused } = planPlaylistSync([renamed], [cached]);

    expect(reused[0].data.title).toBe("Cached A");
    expect(reused[0].meta.path).toBe("/Demos/Renamed.mix");
  });

  it("downloads a playlist whose rev changed", () => {
    const cached = makePlaylist(makeFile("a", "1"), "Cached A");
    const changed = makeFile("a", "2");

    const { reused, toDownload } = planPlaylistSync([changed], [cached]);

    expect(reused).toEqual([]);
    expect(toDownload).toEqual([changed]);
  });

  it("downloads a playlist that is not cached", () => {
    const file = makeFile("new", "1");

    const { reused, toDownload } = planPlaylistSync([file], []);

    expect(reused).toEqual([]);
    expect(toDownload).toEqual([file]);
  });

  it("drops a cached playlist that was not found", () => {
    const cached = makePlaylist(makeFile("deleted", "1"), "Deleted");

    const { reused, toDownload } = planPlaylistSync([], [cached]);

    expect(reused).toEqual([]);
    expect(toDownload).toEqual([]);
  });
});
