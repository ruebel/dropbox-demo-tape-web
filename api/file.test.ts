import { Dropbox } from "dropbox";
import { afterEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "@/api/file";

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
