import { Dropbox } from "dropbox";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPlaylists } from "@/api/playlists";
import { logError } from "@/hooks/useErrorTracking";

vi.mock("@/hooks/useErrorTracking", () => ({ logError: vi.fn() }));

type MockFile = { path: string; contents: string };

// Builds a Dropbox client that finds and downloads the given files
function mockDropbox(files: MockFile[]) {
  return {
    filesSearch: vi.fn().mockResolvedValue({
      result: {
        matches: files.map(({ path }) => ({
          metadata: { path_display: path },
        })),
      },
    }),
    filesDownload: vi.fn(async ({ path }: { path: string }) => {
      const file = files.find((f) => f.path === path);
      return {
        result: {
          id: `id:${path}`,
          name: path.split("/").pop(),
          path_display: path,
          path_lower: path.toLowerCase(),
          fileBlob: new Blob([file?.contents ?? ""]),
        },
      };
    }),
  } as unknown as Dropbox;
}

const playlistData = { artist: "Artist", title: "First", tracks: [] };

describe("fetchPlaylists", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("parses downloaded playlist files", async () => {
    const dbx = mockDropbox([
      { path: "/Demos/First.mix", contents: JSON.stringify(playlistData) },
    ]);

    const [playlist] = await fetchPlaylists(dbx);

    expect(playlist.data).toEqual(playlistData);
    expect(playlist.meta).toMatchObject({
      id: "id:/Demos/First.mix",
      isPlaylist: true,
      path: "/Demos/First.mix",
      type: "file",
    });
    expect(playlist.meta).not.toHaveProperty("fileBlob");
  });

  it("skips and logs files that are not valid JSON", async () => {
    const dbx = mockDropbox([
      { path: "/Demos/Broken.mix", contents: "{ not json" },
      { path: "/Demos/First.mix", contents: JSON.stringify(playlistData) },
    ]);

    const playlists = await fetchPlaylists(dbx);

    expect(playlists.map((p) => p.data.title)).toEqual(["First"]);
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
