import { Dropbox } from "dropbox";
import { afterEach, describe, expect, it, vi } from "vitest";

import { listFolderAudioFiles } from "@/api/folder";

const filesListFolder = vi.fn();
const filesListFolderContinue = vi.fn();
const dbx = { filesListFolder, filesListFolderContinue } as unknown as Dropbox;

function file(name: string) {
  return { ".tag": "file", id: `id:${name}`, name };
}

function folder(name: string) {
  return { ".tag": "folder", id: `id:${name}`, name };
}

function page(entries: object[], cursor: string, has_more = false) {
  return { result: { cursor, entries, has_more } };
}

describe("listFolderAudioFiles", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists the folder by the given id", async () => {
    filesListFolder.mockResolvedValue(page([], "c1"));

    await listFolderAudioFiles(dbx, "id:folder");

    expect(filesListFolder).toHaveBeenCalledWith({ path: "id:folder" });
  });

  it("returns only audio files", async () => {
    filesListFolder.mockResolvedValue(
      page(
        [
          file("Song.mp3"),
          file("Cover.jpg"),
          file("Tape.mix"),
          folder("Stems"),
          file("Take 2.WAV"),
          { ".tag": "deleted", name: "Old.mp3" },
        ],
        "c1"
      )
    );

    const { files } = await listFolderAudioFiles(dbx, "id:folder");

    expect(files.map((f) => f.name)).toEqual(["Song.mp3", "Take 2.WAV"]);
  });

  it("reads every page and returns the cursor from the last one", async () => {
    filesListFolder.mockResolvedValue(page([file("a.mp3")], "c1", true));
    filesListFolderContinue
      .mockResolvedValueOnce(page([file("b.mp3")], "c2", true))
      .mockResolvedValueOnce(page([file("c.mp3")], "c3"));

    const { cursor, files } = await listFolderAudioFiles(dbx, "id:folder");

    expect(files.map((f) => f.name)).toEqual(["a.mp3", "b.mp3", "c.mp3"]);
    expect(cursor).toBe("c3");
    expect(filesListFolderContinue).toHaveBeenNthCalledWith(1, { cursor: "c1" });
    expect(filesListFolderContinue).toHaveBeenNthCalledWith(2, { cursor: "c2" });
  });

  it("returns the cursor of a single page", async () => {
    filesListFolder.mockResolvedValue(page([file("a.mp3")], "c1"));

    const { cursor } = await listFolderAudioFiles(dbx, "id:folder");

    expect(cursor).toBe("c1");
    expect(filesListFolderContinue).not.toHaveBeenCalled();
  });
});
