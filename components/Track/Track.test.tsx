import { cleanup, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it } from "vitest";

import { Track } from "@/components/Track/Track";
import { sessionTrackErrorsAtom } from "@/state/audio";
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

function renderTrack(track: PlaylistTrack, showErrorTooltip?: boolean) {
  render(
    <Provider store={createStore()}>
      <Track
        index={1}
        onClick={() => {}}
        showErrorTooltip={showErrorTooltip}
        track={track}
      />
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

  it("leaves out the tooltip when the message is shown elsewhere", () => {
    renderTrack(makeTrack("This file was moved or deleted in Dropbox"), false);

    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
    expect(screen.getByRole("button").getAttribute("aria-describedby")).toBeNull();
  });

  it("shows an error from this session that is not saved on the track", () => {
    const store = createStore();
    store.set(sessionTrackErrorsAtom, {
      "track-1": "Couldn't reach Dropbox. Check your connection.",
    });
    render(
      <Provider store={store}>
        <Track index={1} onClick={() => {}} track={makeTrack()} />
      </Provider>
    );

    expect(screen.getByRole("tooltip", { hidden: true }).textContent).toBe(
      "Couldn't reach Dropbox. Check your connection."
    );
  });

  it("shows the folder under the title", () => {
    render(
      <Provider store={createStore()}>
        <Track
          folder="/Demos/Disc 1"
          index={1}
          onClick={() => {}}
          track={makeTrack()}
        />
      </Provider>
    );

    expect(document.querySelector("[class*=folder]")?.textContent).toBe(
      "/Demos/Disc 1"
    );
  });

  it("shows no folder when it has none", () => {
    renderTrack(makeTrack());

    expect(screen.getByRole("button").textContent).not.toContain("Demos");
    expect(document.querySelector("[class*=folder]")).toBeNull();
  });
});
