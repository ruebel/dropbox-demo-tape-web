import { describe, expect, it } from "vitest";

import {
  getSubfolderPath,
  getSyncedWithLabel,
  mergeEditedOrder,
  mergeEditedTracks,
} from "@/utils/playlist";
import { PlaylistTrack } from "@/utils/types";

function track(id: string, details: Partial<PlaylistTrack> = {}) {
  return { id, name: `${id}.mp3`, ...details } as PlaylistTrack;
}

describe("getSubfolderPath", () => {
  it("is empty for a track directly in the folder", () => {
    expect(getSubfolderPath("/Demos/Band/a.mp3", "/Demos/Band")).toBe("");
  });

  it("returns the subfolder relative to the folder", () => {
    expect(getSubfolderPath("/Demos/Band/Live/a.mp3", "/Demos/Band")).toBe(
      "Live"
    );
    expect(
      getSubfolderPath("/Demos/Band/Disc 1/Extras/a.mp3", "/Demos/Band")
    ).toBe("Disc 1/Extras");
  });

  it("ignores case and keeps the track path's case", () => {
    expect(getSubfolderPath("/demos/BAND/Live/a.mp3", "/Demos/Band")).toBe(
      "Live"
    );
  });

  it("does not treat a folder with a longer name as a subfolder", () => {
    expect(getSubfolderPath("/Demos/Band 2/a.mp3", "/Demos/Band")).toBe(
      "/Demos/Band 2"
    );
  });

  it("returns the whole parent folder for a track outside the folder", () => {
    expect(getSubfolderPath("/Archive/Live/a.mp3", "/Demos/Band")).toBe(
      "/Archive/Live"
    );
  });
});

describe("getSyncedWithLabel", () => {
  const folder = { id: "id:band", path: "/Demos/Band", sort: "name" as const };

  it("names the folder", () => {
    expect(getSyncedWithLabel(folder)).toBe("Synced with /Demos/Band");
  });

  it("says when subfolders are included", () => {
    expect(getSyncedWithLabel({ ...folder, includeSubfolders: true })).toBe(
      "Synced with /Demos/Band and its subfolders"
    );
  });
});

describe("mergeEditedTracks", () => {
  it("keeps the edited order", () => {
    const latest = [track("a"), track("b"), track("c")];
    const edited = [track("c"), track("a"), track("b")];

    expect(mergeEditedTracks(latest, edited).map((t) => t.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("uses the latest saved details of each track", () => {
    const latest = [
      track("a", { duration: 168, path_lower: "/archive/a.mp3" }),
      track("b"),
    ];
    const edited = [track("b"), track("a", { path_lower: "/demos/a.mp3" })];

    const merged = mergeEditedTracks(latest, edited);

    expect(merged[1]).toBe(latest[0]);
  });

  it("keeps tracks that were just added", () => {
    const latest = [track("a")];
    const added = track("new");

    expect(mergeEditedTracks(latest, [track("a"), added])[1]).toBe(added);
  });

  it("leaves out tracks the edit removed", () => {
    const latest = [track("a"), track("b")];

    expect(mergeEditedTracks(latest, [track("b")]).map((t) => t.id)).toEqual([
      "b",
    ]);
  });
});

describe("mergeEditedOrder", () => {
  it("keeps the edited order", () => {
    const latest = [track("a"), track("b"), track("c")];
    const edited = [track("c"), track("a"), track("b")];

    expect(mergeEditedOrder(latest, edited).map((t) => t.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("uses the latest saved details of each track", () => {
    const latest = [track("a", { duration: 168 }), track("b")];
    const edited = [track("b"), track("a")];

    const merged = mergeEditedOrder(latest, edited);

    expect(merged[1]).toBe(latest[0]);
  });

  it("adds tracks a sync added at the end in their saved order", () => {
    const latest = [track("a"), track("x"), track("b"), track("y")];
    const edited = [track("b"), track("a")];

    expect(mergeEditedOrder(latest, edited).map((t) => t.id)).toEqual([
      "b",
      "a",
      "x",
      "y",
    ]);
  });

  it("leaves out tracks a sync removed", () => {
    const latest = [track("b")];
    const edited = [track("a"), track("b")];

    expect(mergeEditedOrder(latest, edited).map((t) => t.id)).toEqual(["b"]);
  });

  it("does not change the latest list", () => {
    const latest = [track("a"), track("b")];

    mergeEditedOrder(latest, [track("b"), track("a")]);

    expect(latest.map((t) => t.id)).toEqual(["a", "b"]);
  });
});
