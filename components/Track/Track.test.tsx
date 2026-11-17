import { cleanup, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it } from "vitest";

import { Track } from "@/components/Track/Track";
import { PlaylistTrack } from "@/utils/types";

function makeTrack(error?: string) {
  return {
    ".tag": "file",
    error,
    id: "track-1",
    name: "Song.mp3",
    path_lower: "/demos/song.mp3",
    server_modified: "2026-10-01T12:00:00Z",
  } as PlaylistTrack;
}

function renderTrack(track: PlaylistTrack) {
  render(
    <Provider store={createStore()}>
      <Track index={1} onClick={() => {}} track={track} />
    </Provider>
  );
}

describe("Track", () => {
  afterEach(cleanup);

  it("describes a failed track with its error message", () => {
    renderTrack(makeTrack("This file was moved or deleted in Dropbox"));

    expect(screen.getByRole("tooltip", { hidden: true }).textContent).toBe(
      "This file was moved or deleted in Dropbox"
    );
    const button = screen.getByRole("button");
    const tooltipId = button.getAttribute("aria-describedby");
    expect(tooltipId).toBeTruthy();
    expect(document.getElementById(tooltipId as string)?.textContent).toBe(
      "This file was moved or deleted in Dropbox"
    );
  });

  it("has no tooltip when the track has no error", () => {
    renderTrack(makeTrack());

    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
    expect(screen.getByRole("button").getAttribute("aria-describedby")).toBeNull();
  });
});
