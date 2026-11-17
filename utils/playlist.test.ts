import { describe, expect, it } from "vitest";

import { mergeEditedTracks } from "@/utils/playlist";
import { PlaylistTrack } from "@/utils/types";

function track(id: string, details: Partial<PlaylistTrack> = {}) {
  return { id, name: `${id}.mp3`, ...details } as PlaylistTrack;
}

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
