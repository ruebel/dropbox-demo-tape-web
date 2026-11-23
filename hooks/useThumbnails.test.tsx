import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { Dropbox } from "dropbox";
import { createStore, Provider } from "jotai";
import { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getThumbnails } from "@/api/file";
import { useThumbnails } from "@/hooks/useThumbnails";
import { dbxAtom } from "@/state/dropbox";
import { EnhancedFileMeta } from "@/utils/types";

vi.mock("@/api/file", () => ({ getThumbnails: vi.fn() }));

const dbx = {} as Dropbox;

function makeFile(name: string, rev = "1") {
  return {
    name,
    path_lower: `/art/${name.toLowerCase()}`,
    rev,
    type: "file",
  } as EnhancedFileMeta;
}

const cover = makeFile("Cover.jpg");
const back = makeFile("Back.png");
const song = makeFile("Song.mp3");
const folder = {
  name: "Old",
  path_lower: "/art/old",
  type: "folder",
} as EnhancedFileMeta;

function renderThumbnails(files: EnhancedFileMeta[], enabled = true) {
  const store = createStore();
  store.set(dbxAtom, dbx);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(
    ({ files, enabled }) => useThumbnails(files, enabled),
    { initialProps: { enabled, files }, wrapper }
  );
}

describe("useThumbnails", () => {
  beforeEach(() => {
    // A thumbnail for every path asked for
    vi.mocked(getThumbnails).mockImplementation(async (_dbx, paths) => {
      return new Map(paths.map((path) => [path, `data:${path}`]));
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("returns a thumbnail for each image, by path", async () => {
    const { result } = renderThumbnails([folder, cover, song, back]);

    await waitFor(() => expect(result.current.size).toBe(2));
    expect(result.current).toEqual(
      new Map([
        ["/art/cover.jpg", "data:/art/cover.jpg"],
        ["/art/back.png", "data:/art/back.png"],
      ])
    );
    // Folders and audio files have no thumbnail to ask for
    expect(getThumbnails).toHaveBeenCalledExactlyOnceWith(dbx, [
      "/art/cover.jpg",
      "/art/back.png",
    ]);
  });

  it("asks for nothing when it is not enabled", () => {
    const { result } = renderThumbnails([cover], false);

    expect(result.current.size).toBe(0);
    expect(getThumbnails).not.toHaveBeenCalled();
  });

  it("leaves out an image that has no thumbnail", async () => {
    vi.mocked(getThumbnails).mockResolvedValue(
      new Map([["/art/back.png", "data:back"]])
    );

    const { result } = renderThumbnails([cover, back]);

    await waitFor(() => expect(result.current.size).toBe(1));
    expect(result.current.has("/art/cover.jpg")).toBe(false);
  });

  it("does not ask again for images it already has", async () => {
    const { rerender, result } = renderThumbnails([cover]);
    await waitFor(() => expect(result.current.size).toBe(1));

    // Opens another folder, then goes back
    rerender({ enabled: true, files: [back] });
    await waitFor(() => expect(result.current.has("/art/back.png")).toBe(true));
    rerender({ enabled: true, files: [cover] });

    expect(result.current.get("/art/cover.jpg")).toBe("data:/art/cover.jpg");
    expect(getThumbnails).toHaveBeenCalledTimes(2);
    expect(getThumbnails).toHaveBeenLastCalledWith(dbx, ["/art/back.png"]);
  });

  it("asks again for an image that changed", async () => {
    const { rerender, result } = renderThumbnails([cover]);
    await waitFor(() => expect(result.current.size).toBe(1));

    vi.mocked(getThumbnails).mockResolvedValue(
      new Map([["/art/cover.jpg", "data:new"]])
    );
    rerender({ enabled: true, files: [makeFile("Cover.jpg", "2")] });

    await waitFor(() =>
      expect(result.current.get("/art/cover.jpg")).toBe("data:new")
    );
    expect(getThumbnails).toHaveBeenCalledTimes(2);
  });
});
