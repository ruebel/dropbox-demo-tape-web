import { describe, expect, it } from "vitest";

import { transformFile } from "@/utils/file";
import {
  compareFileNames,
  reconcileFolderTracks,
  sortTracksByPath,
} from "@/utils/folderSync";
import { FileMeta, PlaylistTrack } from "@/utils/types";

function makeFile(
  name: string,
  {
    dir = "/Demos",
    id = `id:${dir}/${name}`,
    rev = "1",
  }: { dir?: string; id?: string; rev?: string } = {}
) {
  const path = `${dir}/${name}`;
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

function paths(tracks: PlaylistTrack[] | undefined) {
  return tracks?.map((track) => track.path);
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

describe("sortTracksByPath", () => {
  it("returns a copy in file name order for files in one folder", () => {
    const tracks = [
      makeTrack(makeFile("Track 10.mp3")),
      makeTrack(makeFile("Track 2.mp3")),
    ];

    expect(names(sortTracksByPath(tracks))).toEqual([
      "Track 2.mp3",
      "Track 10.mp3",
    ]);
    expect(names(tracks)).toEqual(["Track 10.mp3", "Track 2.mp3"]);
  });

  it("keeps each subfolder's files together", () => {
    const tracks = [
      makeTrack(makeFile("02.mp3", { dir: "/Demos/Disc 2" })),
      makeTrack(makeFile("02.mp3", { dir: "/Demos/Disc 1" })),
      makeTrack(makeFile("01.mp3", { dir: "/Demos/Disc 2" })),
      makeTrack(makeFile("01.mp3", { dir: "/Demos/Disc 1" })),
    ];

    expect(paths(sortTracksByPath(tracks))).toEqual([
      "/Demos/Disc 1/01.mp3",
      "/Demos/Disc 1/02.mp3",
      "/Demos/Disc 2/01.mp3",
      "/Demos/Disc 2/02.mp3",
    ]);
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

  it("keeps files with the same name in different subfolders", () => {
    const disc1 = makeFile("Intro.mp3", { dir: "/Demos/Disc 1" });
    const disc2 = makeFile("Intro.mp3", { dir: "/Demos/Disc 2" });

    const result = reconcileFolderTracks([], [disc2, disc1], "name");

    expect(paths(result)).toEqual([
      "/Demos/Disc 1/Intro.mp3",
      "/Demos/Disc 2/Intro.mp3",
    ]);
  });

  it("keeps the place of a file uploaded again in a subfolder", () => {
    const dir = "/Demos/Disc 2";
    const old = makeFile("Intro.mp3", { dir, id: "id:old" });
    const a = makeFile("a.mp3");
    const reuploaded = makeFile("Intro.mp3", { dir, id: "id:new" });

    const result = reconcileFolderTracks(
      [makeTrack(old), makeTrack(a)],
      [a, reuploaded],
      "custom"
    );

    expect(result?.map((track) => track.id)).toEqual([
      "id:new",
      "id:/Demos/a.mp3",
    ]);
  });

  it("does not give a removed track's place to a file with the same name in another subfolder", () => {
    const removed = makeFile("Intro.mp3", { dir: "/Demos/Disc 1" });
    const a = makeFile("a.mp3");
    const other = makeFile("Intro.mp3", { dir: "/Demos/Disc 2" });

    const result = reconcileFolderTracks(
      [makeTrack(removed), makeTrack(a)],
      [a, other],
      "custom"
    );

    expect(paths(result)).toEqual([
      "/Demos/a.mp3",
      "/Demos/Disc 2/Intro.mp3",
    ]);
  });

  it("prefers an id match over a path match for the same file", () => {
    const original = makeFile("a.mp3", { id: "id:1" });
    // A stale track whose path matches the file that the first track owns
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
