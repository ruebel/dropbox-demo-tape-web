import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PlaylistHeader } from "@/components/PlaylistHeader/PlaylistHeader";
import { Playlist, PlaylistData } from "@/utils/types";

// Needs Dropbox to load the image
vi.mock("@/components/PlaylistImage/PlaylistImage", () => ({
  PlaylistImage: () => null,
}));

function makePlaylist(data: Partial<PlaylistData> = {}) {
  return {
    data: { artist: "Hunted Horse", title: "Band", tracks: [], ...data },
    meta: { id: "id:tape" },
  } as unknown as Playlist;
}

describe("PlaylistHeader", () => {
  afterEach(() => {
    cleanup();
  });

  it("marks the track count of a folder playlist with its folder", () => {
    render(
      <PlaylistHeader
        playlist={makePlaylist({
          folder: { id: "id:band", path: "/Demos/Band", sort: "name" },
        })}
      />
    );

    const icon = screen.getByRole("img", {
      description: "Synced with /Demos/Band",
      name: "Folder playlist",
    });
    // The icon and the count share the anchor that shows the tooltip
    expect(icon.parentElement?.textContent).toContain("0 tracks");
  });

  it("shows no folder for a playlist with picked tracks", () => {
    render(<PlaylistHeader playlist={makePlaylist()} />);

    expect(screen.getByText(/0 tracks/)).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });
});
