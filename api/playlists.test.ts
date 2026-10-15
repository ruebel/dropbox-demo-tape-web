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

// Wraps file metadata the way search v2 returns it
function searchMatch(meta: FileMeta) {
  return { metadata: { ".tag": "metadata", metadata: meta } };
}

function searchPage(matches: object[], cursor?: string) {
  return { result: { matches, has_more: Boolean(cursor), cursor } };
}

// Builds a Dropbox client that finds and downloads the given files
function mockDropbox(files: MockFile[]) {
  return {
    filesSearchV2: vi
      .fn()
      .mockResolvedValue(
        searchPage(files.map(({ path, tag }) => searchMatch(fileMeta(path, tag))))
      ),
    filesSearchContinueV2: vi.fn(),
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
  it("searches by file extension with the largest page size", async () => {
    const dbx = mockDropbox([]);

    await searchPlaylistFiles(dbx);

    expect(dbx.filesSearchV2).toHaveBeenCalledWith({
      query: ".mix",
      options: {
        file_extensions: ["mix"],
        filename_only: true,
        max_results: 1000,
      },
    });
  });

  it("reads every page of results", async () => {
    const dbx = mockDropbox([]);
    vi.mocked(dbx.filesSearchV2).mockResolvedValue(
      searchPage([searchMatch(fileMeta("/A.mix"))], "page-2") as never
    );
    vi.mocked(dbx.filesSearchContinueV2)
      .mockResolvedValueOnce(
        searchPage([searchMatch(fileMeta("/B.mix"))], "page-3") as never
      )
      .mockResolvedValueOnce(
        searchPage([searchMatch(fileMeta("/C.mix"))]) as never
      );

    const files = await searchPlaylistFiles(dbx);

    expect(files.map((file) => file.path_display)).toEqual([
      "/A.mix",
      "/B.mix",
      "/C.mix",
    ]);
    expect(dbx.filesSearchContinueV2).toHaveBeenNthCalledWith(1, {
      cursor: "page-2",
    });
    expect(dbx.filesSearchContinueV2).toHaveBeenNthCalledWith(2, {
      cursor: "page-3",
    });
  });

  it("returns a file only once when pages repeat it", async () => {
    const dbx = mockDropbox([]);
    vi.mocked(dbx.filesSearchV2).mockResolvedValue(
      searchPage([searchMatch(fileMeta("/A.mix"))], "page-2") as never
    );
    vi.mocked(dbx.filesSearchContinueV2).mockResolvedValue(
      searchPage([
        searchMatch(fileMeta("/A.mix")),
        searchMatch(fileMeta("/B.mix")),
      ]) as never
    );

    const files = await searchPlaylistFiles(dbx);

    expect(files.map((file) => file.path_display)).toEqual(["/A.mix", "/B.mix"]);
  });

  it("skips folders and results without metadata", async () => {
    const dbx = mockDropbox([]);
    vi.mocked(dbx.filesSearchV2).mockResolvedValue(
      searchPage([
        searchMatch(fileMeta("/Demos/First.mix")),
        searchMatch(fileMeta("/Old.mix", "folder")),
        { metadata: { ".tag": "other" } },
      ]) as never
    );

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
