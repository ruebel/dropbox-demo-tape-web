import { describe, expect, it } from "vitest";

import { transformFile } from "@/utils/file";
import {
  compareFileNames,
  reconcileFolderTracks,
  sortTracksByName,
} from "@/utils/folderSync";
import { FileMeta, PlaylistTrack } from "@/utils/types";

function makeFile(name: string, { id = `id:${name}`, rev = "1" } = {}) {
  const path = `/Demos/${name}`;
  return {
    ".tag": "file",
    id,
    name,
    path_display: path,
    path_lower: path.toLowerCase(),
    rev,
    server_modified: `2026-10-0${rev}T12:00:00Z`,
  } as FileMeta;
}

function makeTrack(
  file: FileMeta,
  extra: Partial<PlaylistTrack> = {}
): PlaylistTrack {
  return { ...transformFile(file), ...extra };
}

function names(tracks: PlaylistTrack[] | undefined) {
  return tracks?.map((track) => track.name);
}

describe("compareFileNames", () => {
  it("sorts numbers inside names by value", () => {
    const sorted = ["Track 10.mp3", "Track 2.mp3", "Track 1.mp3"].sort(
      compareFileNames
    );

    expect(sorted).toEqual(["Track 1.mp3", "Track 2.mp3", "Track 10.mp3"]);
  });

  it("ignores case when sorting by letter", () => {
    const sorted = ["banana.mp3", "Apple.mp3", "cherry.mp3"].sort(
      compareFileNames
    );

    expect(sorted).toEqual(["Apple.mp3", "banana.mp3", "cherry.mp3"]);
  });
});

describe("sortTracksByName", () => {
  it("returns a copy in file name order", () => {
    const tracks = [
      makeTrack(makeFile("Track 10.mp3")),
      makeTrack(makeFile("Track 2.mp3")),
    ];

    expect(names(sortTracksByName(tracks))).toEqual([
      "Track 2.mp3",
      "Track 10.mp3",
    ]);
    expect(names(tracks)).toEqual(["Track 10.mp3", "Track 2.mp3"]);
  });
});

describe("reconcileFolderTracks", () => {
  it("returns undefined when the tracks match the folder", () => {
    const a = makeFile("a.mp3");
    const b = makeFile("b.mp3");

    const result = reconcileFolderTracks(
      [makeTrack(a), makeTrack(b)],
      [b, a],
      "name"
    );

    expect(result).toBeUndefined();
  });

  it("adds every file in name order to an empty playlist", () => {
    const files = [
      makeFile("Track 10.mp3"),
      makeFile("Track 2.mp3"),
      makeFile("Track 1.mp3"),
    ];

    const result = reconcileFolderTracks([], files, "name");

    expect(names(result)).toEqual([
      "Track 1.mp3",
      "Track 2.mp3",
      "Track 10.mp3",
    ]);
  });

  it("puts a new file in its name position when sorting by name", () => {
    const a = makeFile("a.mp3");
    const c = makeFile("c.mp3");
    const b = makeFile("b.mp3");

    const result = reconcileFolderTracks(
      [makeTrack(a), makeTrack(c)],
      [a, b, c],
      "name"
    );

    expect(names(result)).toEqual(["a.mp3", "b.mp3", "c.mp3"]);
  });

  it("keeps the custom order and adds new files at the end in name order", () => {
    const a = makeFile("a.mp3");
    const c = makeFile("c.mp3");
    const b = makeFile("b.mp3");
    const d = makeFile("d.mp3");

    const result = reconcileFolderTracks(
      [makeTrack(c), makeTrack(a)],
      [d, a, b, c],
      "custom"
    );

    expect(names(result)).toEqual(["c.mp3", "a.mp3", "b.mp3", "d.mp3"]);
  });

  it("removes a track whose file is gone", () => {
    const a = makeFile("a.mp3");
    const b = makeFile("b.mp3");

    const result = reconcileFolderTracks(
      [makeTrack(a), makeTrack(b)],
      [b],
      "custom"
    );

    expect(names(result)).toEqual(["b.mp3"]);
  });

  it("moves a renamed file to its new name position when sorting by name", () => {
    const a = makeFile("a.mp3");
    const b = makeFile("b.mp3");
    const renamed = { ...a, name: "z.mp3", path_lower: "/demos/z.mp3" };

    const result = reconcileFolderTracks(
      [makeTrack(a), makeTrack(b)],
      [renamed, b],
      "name"
    );

    expect(names(result)).toEqual(["b.mp3", "z.mp3"]);
  });

  it("keeps a renamed file in place when the order is custom", () => {
    const a = makeFile("a.mp3");
    const b = makeFile("b.mp3");
    const renamed = { ...a, name: "z.mp3", path_lower: "/demos/z.mp3" };

    const result = reconcileFolderTracks(
      [makeTrack(a), makeTrack(b)],
      [renamed, b],
      "custom"
    );

    expect(names(result)).toEqual(["z.mp3", "b.mp3"]);
  });

  it("keeps the place of a file uploaded again under the same name", () => {
    const old = makeFile("b.mp3", { id: "id:old" });
    const a = makeFile("a.mp3");
    const reuploaded = makeFile("B.MP3", { id: "id:new" });

    const result = reconcileFolderTracks(
      [makeTrack(old, { duration: 120, error: "Broken" }), makeTrack(a)],
      [a, reuploaded],
      "custom"
    );

    expect(names(result)).toEqual(["B.MP3", "a.mp3"]);
    // A different file, so nothing from the old track carries over
    expect(result?.[0]).toEqual(transformFile(reuploaded));
  });

  it("prefers an id match over a name match for the same file", () => {
    const original = makeFile("a.mp3", { id: "id:1" });
    // A stale track whose name matches the file that the first track owns
    const stale = makeTrack(makeFile("a.mp3", { id: "id:2" }));

    const result = reconcileFolderTracks(
      [stale, makeTrack(original, { duration: 90 })],
      [original],
      "custom"
    );

    expect(result).toHaveLength(1);
    expect(result?.[0].id).toBe("id:1");
    expect(result?.[0].duration).toBe(90);
  });

  it("updates a changed file, keeps its duration, and clears its error", () => {
    const file = makeFile("a.mp3", { rev: "1" });
    const changed = makeFile("a.mp3", { rev: "2" });

    const result = reconcileFolderTracks(
      [makeTrack(file, { duration: 120, error: "Broken", errorCode: "not_found" })],
      [changed],
      "name"
    );

    expect(result?.[0].rev).toBe("2");
    expect(result?.[0].duration).toBe(120);
    expect(result?.[0].error).toBeUndefined();
    expect(result?.[0].errorCode).toBeUndefined();
  });

  it("keeps the error and duration of a file that did not change", () => {
    const file = makeFile("a.mp3");
    const track = makeTrack(file, { duration: 120, error: "Broken" });

    const result = reconcileFolderTracks([track], [file], "name");

    expect(result).toBeUndefined();
  });

  it("keeps unchanged tracks as the same objects", () => {
    const a = makeFile("a.mp3");
    const b = makeFile("b.mp3");
    const trackA = makeTrack(a, { duration: 60 });

    const result = reconcileFolderTracks([trackA], [a, b], "name");

    expect(result?.[0]).toBe(trackA);
  });
});
