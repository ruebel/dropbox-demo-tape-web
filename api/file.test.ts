import { Dropbox } from "dropbox";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getThumbnails, uploadFile } from "@/api/file";

const filesUpload = vi.fn();
const dbx = { filesUpload } as unknown as Dropbox;

describe("uploadFile", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("overwrites the file at the path by default", async () => {
    filesUpload.mockResolvedValue({ result: { id: "id:tape" } });

    const result = await uploadFile(dbx, { title: "Tape" }, "/Demos/Tape.mix");

    expect(result).toEqual({ id: "id:tape" });
    expect(filesUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        autorename: false,
        contents: JSON.stringify({ title: "Tape" }),
        mode: { ".tag": "overwrite" },
        path: "/Demos/Tape.mix",
      })
    );
  });

  it("only adds a new file when overwrite is false", async () => {
    filesUpload.mockResolvedValue({ result: { id: "id:tape" } });

    await uploadFile(dbx, {}, "/Demos/Tape.mix", { overwrite: false });

    expect(filesUpload).toHaveBeenCalledWith(
      expect.objectContaining({ autorename: false, mode: { ".tag": "add" } })
    );
  });
});

const filesGetThumbnailBatch = vi.fn();
const thumbnailDbx = { filesGetThumbnailBatch } as unknown as Dropbox;

// A batch response with a thumbnail for each path, in request order
function thumbnailBatch(paths: string[]) {
  return {
    result: {
      entries: paths.map((path) => ({
        ".tag": "success",
        metadata: { path_lower: path },
        thumbnail: `thumb-of-${path}`,
      })),
    },
  };
}

describe("getThumbnails", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns a JPEG data URL for each image", async () => {
    filesGetThumbnailBatch.mockResolvedValue(
      thumbnailBatch(["/art/a.jpg", "/art/b.png"])
    );

    const thumbnails = await getThumbnails(thumbnailDbx, [
      "/art/a.jpg",
      "/art/b.png",
    ]);

    expect(thumbnails).toEqual(
      new Map([
        ["/art/a.jpg", "data:image/jpeg;base64,thumb-of-/art/a.jpg"],
        ["/art/b.png", "data:image/jpeg;base64,thumb-of-/art/b.png"],
      ])
    );
    expect(filesGetThumbnailBatch).toHaveBeenCalledWith({
      entries: [
        {
          format: { ".tag": "jpeg" },
          path: "/art/a.jpg",
          size: { ".tag": "w128h128" },
        },
        {
          format: { ".tag": "jpeg" },
          path: "/art/b.png",
          size: { ".tag": "w128h128" },
        },
      ],
    });
  });

  it("asks for at most 25 images per request", async () => {
    filesGetThumbnailBatch.mockImplementation(
      ({ entries }: { entries: { path: string }[] }) =>
        Promise.resolve(thumbnailBatch(entries.map(({ path }) => path)))
    );
    const paths = Array.from({ length: 30 }, (_, i) => `/art/${i}.jpg`);

    const thumbnails = await getThumbnails(thumbnailDbx, paths);

    expect(filesGetThumbnailBatch).toHaveBeenCalledTimes(2);
    expect(filesGetThumbnailBatch.mock.calls[0][0].entries).toHaveLength(25);
    expect(filesGetThumbnailBatch.mock.calls[1][0].entries).toHaveLength(5);
    expect(thumbnails.size).toBe(30);
  });

  it("makes no request when there are no images", async () => {
    const thumbnails = await getThumbnails(thumbnailDbx, []);

    expect(thumbnails.size).toBe(0);
    expect(filesGetThumbnailBatch).not.toHaveBeenCalled();
  });

  it("leaves out images that have no thumbnail", async () => {
    filesGetThumbnailBatch.mockResolvedValue({
      result: {
        entries: [
          { ".tag": "failure", failure: { ".tag": "unsupported_image" } },
          { ".tag": "success", thumbnail: "ok" },
        ],
      },
    });

    const thumbnails = await getThumbnails(thumbnailDbx, [
      "/art/broken.jpg",
      "/art/ok.jpg",
    ]);

    expect(thumbnails).toEqual(
      new Map([["/art/ok.jpg", "data:image/jpeg;base64,ok"]])
    );
  });

  it("keeps the thumbnails from requests that did not fail", async () => {
    filesGetThumbnailBatch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockImplementationOnce(
        ({ entries }: { entries: { path: string }[] }) =>
          Promise.resolve(thumbnailBatch(entries.map(({ path }) => path)))
      );
    const paths = Array.from({ length: 26 }, (_, i) => `/art/${i}.jpg`);

    const thumbnails = await getThumbnails(thumbnailDbx, paths);

    expect([...thumbnails.keys()]).toEqual(["/art/25.jpg"]);
  });
});
