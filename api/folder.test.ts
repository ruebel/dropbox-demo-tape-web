import { Dropbox, DropboxResponseError } from "dropbox";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { listFolderAudioFiles, watchFolder } from "@/api/folder";

const filesListFolder = vi.fn();
const filesListFolderContinue = vi.fn();
const filesListFolderLongpoll = vi.fn();
const dbx = {
  filesListFolder,
  filesListFolderContinue,
  filesListFolderLongpoll,
} as unknown as Dropbox;

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

describe("watchFolder", () => {
  let controller: AbortController;

  function poll(changes: boolean, backoff?: number) {
    return { result: { changes, ...(backoff && { backoff }) } };
  }

  // Like a real long poll with no changes: waits until the watch stops
  function waitForAbort(_arg: unknown, { signal }: { signal: AbortSignal }) {
    return new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason));
    });
  }

  function cursors() {
    return filesListFolderLongpoll.mock.calls.map(([arg]) => arg.cursor);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    controller = new AbortController();
    filesListFolderLongpoll.mockImplementation(waitForAbort);
  });

  afterEach(() => {
    controller.abort();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("calls onChange after a change and polls with the new cursor", async () => {
    filesListFolderLongpoll.mockResolvedValueOnce(poll(true));
    const onChange = vi.fn().mockResolvedValue("c2");

    const watching = watchFolder(dbx, "c1", {
      onChange,
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(cursors()).toEqual(["c1", "c2"]);

    controller.abort();
    await watching;
  });

  it("calls onChange first when there is no cursor yet", async () => {
    const onChange = vi.fn().mockResolvedValue("c1");

    const watching = watchFolder(dbx, undefined, {
      onChange,
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(cursors()).toEqual(["c1"]);

    controller.abort();
    await watching;
  });

  it("retries the first onChange after a wait when it fails", async () => {
    const onChange = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce("c1");

    const watching = watchFolder(dbx, undefined, {
      onChange,
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(filesListFolderLongpoll).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5_000);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(cursors()).toEqual(["c1"]);

    controller.abort();
    await watching;
  });

  it("polls again with the same cursor when nothing changed", async () => {
    filesListFolderLongpoll.mockResolvedValueOnce(poll(false));
    const onChange = vi.fn();

    const watching = watchFolder(dbx, "c1", {
      onChange,
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(onChange).not.toHaveBeenCalled();
    expect(cursors()).toEqual(["c1", "c1"]);

    controller.abort();
    await watching;
  });

  it("waits the backoff Dropbox asks for before polling again", async () => {
    filesListFolderLongpoll.mockResolvedValueOnce(poll(true, 10));
    const onChange = vi.fn().mockResolvedValue("c2");

    const watching = watchFolder(dbx, "c1", {
      onChange,
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(0);

    // The change is synced right away, and only the next poll waits
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(cursors()).toEqual(["c1"]);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(cursors()).toEqual(["c1", "c2"]);

    controller.abort();
    await watching;
  });

  it("stops when the signal aborts during a poll", async () => {
    const onError = vi.fn();
    const watching = watchFolder(dbx, "c1", {
      onChange: vi.fn(),
      onError,
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(0);

    controller.abort();
    await watching;

    expect(onError).not.toHaveBeenCalled();
    expect(filesListFolderLongpoll).toHaveBeenCalledTimes(1);
  });

  it("stops when onChange returns no cursor", async () => {
    filesListFolderLongpoll.mockResolvedValueOnce(poll(true));

    await watchFolder(dbx, "c1", {
      onChange: vi.fn().mockResolvedValue(undefined),
      signal: controller.signal,
    });

    expect(filesListFolderLongpoll).toHaveBeenCalledTimes(1);
  });

  it("reports a failed poll and polls again after a wait that doubles", async () => {
    const error = new TypeError("Failed to fetch");
    filesListFolderLongpoll
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error);
    const onError = vi.fn();

    const watching = watchFolder(dbx, "c1", {
      onChange: vi.fn(),
      onError,
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(onError).toHaveBeenCalledWith(error);
    expect(filesListFolderLongpoll).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(filesListFolderLongpoll).toHaveBeenCalledTimes(2);

    // The second wait is twice as long
    await vi.advanceTimersByTimeAsync(5_000);
    expect(filesListFolderLongpoll).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(filesListFolderLongpoll).toHaveBeenCalledTimes(3);

    controller.abort();
    await watching;
  });

  it("calls onChange again without polling when it failed", async () => {
    const error = new Error("path/not_found");
    filesListFolderLongpoll.mockResolvedValueOnce(poll(true));
    const onChange = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("c2");
    const onError = vi.fn();

    const watching = watchFolder(dbx, "c1", {
      onChange,
      onError,
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(onError).toHaveBeenCalledWith(error);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(cursors()).toEqual(["c1", "c2"]);

    controller.abort();
    await watching;
  });

  it("calls onChange for a new cursor when Dropbox resets the cursor", async () => {
    filesListFolderLongpoll.mockRejectedValueOnce(
      new DropboxResponseError(409, {}, { error_summary: "reset/..." })
    );
    const onChange = vi.fn().mockResolvedValue("c2");

    const watching = watchFolder(dbx, "c1", {
      onChange,
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(5_000);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(cursors()).toEqual(["c1", "c2"]);

    controller.abort();
    await watching;
  });
});
