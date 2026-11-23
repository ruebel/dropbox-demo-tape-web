import { cleanup, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it } from "vitest";

import { Track } from "@/components/Track/Track";
import {
  audioStateAtom,
  playingTrackIdAtom,
  sessionTrackErrorsAtom,
} from "@/state/audio";
import { AudioState, PlaylistTrack } from "@/utils/types";

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

  describe("number column", () => {
    // The first path of each icon's SVG, to tell the icons apart
    const PLAY = "M8 5v14l11-7z";
    const PAUSE = "M6 19h4V5H6zm8-14v14h4V5z";
    const HEADSET = "M12 1c";

    function renderNumber(audioState?: AudioState, error?: string) {
      const store = createStore();
      if (audioState) {
        store.set(playingTrackIdAtom, "track-1");
        store.set(audioStateAtom, audioState);
      }
      render(
        <Provider store={store}>
          <Track index={7} onClick={() => {}} track={makeTrack(error)} />
        </Provider>
      );
    }

    // What the cell shows at rest, and on hover or focus
    function cell(part: "numberResting" | "numberHover") {
      const element = document.querySelector(`[class*=${part}]`);
      const path = element?.querySelector("path")?.getAttribute("d");
      return path ?? element?.textContent;
    }

    it("shows the number, and play on hover", () => {
      renderNumber();

      expect(cell("numberResting")).toBe("7");
      expect(cell("numberHover")).toBe(PLAY);
    });

    it("shows a headset for the playing track, and pause on hover", () => {
      renderNumber("playing");

      expect(cell("numberResting")).toMatch(HEADSET);
      expect(cell("numberHover")).toBe(PAUSE);
    });

    it("shows a headset while the track loads, and play on hover", () => {
      renderNumber("loading");

      expect(cell("numberResting")).toMatch(HEADSET);
      expect(cell("numberHover")).toBe(PLAY);
    });

    it("shows the number for the paused track, and play on hover", () => {
      renderNumber("paused");

      expect(cell("numberResting")).toBe("7");
      expect(cell("numberHover")).toBe(PLAY);
    });

    it("shows only the error icon for a failed track", () => {
      renderNumber(undefined, "This file was moved or deleted in Dropbox");

      expect(document.querySelector("[class*=numberResting]")).toBeNull();
      expect(document.querySelector("[class*=numberHover]")).toBeNull();
      expect(document.querySelector("[class*=errorIcon] svg")).toBeTruthy();
    });
  });

  it("shows no folder when it has none", () => {
    renderTrack(makeTrack());

    expect(screen.getByRole("button").textContent).not.toContain("Demos");
    expect(document.querySelector("[class*=folder]")).toBeNull();
  });
});
