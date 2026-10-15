import { Dropbox } from "dropbox";
import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadPlaylists, searchPlaylistFiles } from "@/api/playlists";
import { logError } from "@/hooks/useErrorTracking";
import { FileMeta } from "@/utils/types";

vi.mock("@/hooks/useErrorTracking", () => ({ logError: vi.fn() }));

type MockFile = { path: string; contents: string; tag?: string };

function fileMeta(path: string, tag = "file") {
  return {
    ".tag": tag,
    id: `id:${path}`,
    name: path.split("/").pop(),
    path_display: path,
    path_lower: path.toLowerCase(),
    rev: "1",
  } as FileMeta;
}

// Builds a Dropbox client that finds and downloads the given files
function mockDropbox(files: MockFile[]) {
  return {
    filesSearch: vi.fn().mockResolvedValue({
      result: {
        matches: files.map(({ path, tag }) => ({ metadata: fileMeta(path, tag) })),
      },
    }),
    filesDownload: vi.fn(async ({ path }: { path: string }) => {
      const file = files.find((f) => f.path === path);
      const { ".tag": _tag, ...meta } = fileMeta(path);
      return {
        result: { ...meta, fileBlob: new Blob([file?.contents ?? ""]) },
      };
    }),
  } as unknown as Dropbox;
}

const playlistData = { artist: "Artist", title: "First", tracks: [] };

describe("searchPlaylistFiles", () => {
  it("returns playlist files and skips folders", async () => {
    const dbx = mockDropbox([
      { path: "/Demos/First.mix", contents: "" },
      { path: "/Old.mix", contents: "", tag: "folder" },
    ]);

    const files = await searchPlaylistFiles(dbx);

    expect(files.map((file) => file.path_display)).toEqual(["/Demos/First.mix"]);
  });
});

describe("downloadPlaylists", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("parses downloaded playlist files", async () => {
    const dbx = mockDropbox([
      { path: "/Demos/First.mix", contents: JSON.stringify(playlistData) },
    ]);

    const [playlist] = await downloadPlaylists(dbx, [fileMeta("/Demos/First.mix")]);

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

    const playlists = await downloadPlaylists(dbx, [
      fileMeta("/Demos/Broken.mix"),
      fileMeta("/Demos/First.mix"),
    ]);

    expect(playlists.map((p) => p.data.title)).toEqual(["First"]);
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it("passes the abort signal to each download", async () => {
    const dbx = mockDropbox([
      { path: "/Demos/First.mix", contents: JSON.stringify(playlistData) },
    ]);
    const { signal } = new AbortController();

    await downloadPlaylists(dbx, [fileMeta("/Demos/First.mix")], signal);

    expect(dbx.filesDownload).toHaveBeenCalledWith(
      { path: "/Demos/First.mix" },
      { signal }
    );
  });
});
