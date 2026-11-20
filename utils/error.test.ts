import { DropboxResponseError } from "dropbox";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_TRACK_ERROR,
  getMediaErrorMessage,
  getTrackErrorMessage,
  isPathConflictError,
  isPathNotFoundError,
  isTransientError,
  MEDIA_ERROR,
} from "@/utils/error";

function dropboxError(status: number, body: unknown) {
  return new DropboxResponseError(status, {}, body);
}

describe("getTrackErrorMessage", () => {
  it("explains a missing file", () => {
    const error = dropboxError(409, {
      error_summary: "path/not_found/..",
      error: { ".tag": "path" },
    });

    expect(getTrackErrorMessage(error)).toBe(
      "This file was moved or deleted in Dropbox"
    );
  });

  it("explains rate limiting", () => {
    const error = dropboxError(429, {
      error_summary: "too_many_requests/..",
    });

    expect(getTrackErrorMessage(error)).toBe(
      "Dropbox is limiting requests. Try again in a minute."
    );
  });

  it("shows the error code for other Dropbox errors", () => {
    const error = dropboxError(409, {
      error_summary: "unsupported_file/...",
    });

    expect(getTrackErrorMessage(error)).toBe("Dropbox error: unsupported_file");
  });

  it("falls back when a Dropbox error has no JSON body", () => {
    const error = dropboxError(409, "Conflict");

    expect(getTrackErrorMessage(error)).toBe(DEFAULT_TRACK_ERROR);
  });

  it("explains a Dropbox server error", () => {
    expect(getTrackErrorMessage(dropboxError(503, "Service Unavailable"))).toBe(
      "Dropbox is having trouble. Try again later."
    );
  });

  it("explains a network failure", () => {
    expect(getTrackErrorMessage(new TypeError("Failed to fetch"))).toBe(
      "Couldn't reach Dropbox. Check your connection."
    );
  });

  it("falls back for any other error", () => {
    expect(getTrackErrorMessage(new Error("boom"))).toBe(DEFAULT_TRACK_ERROR);
    expect(getTrackErrorMessage("boom")).toBe(DEFAULT_TRACK_ERROR);
  });
});

describe("isPathNotFoundError", () => {
  it("is true for a Dropbox path/not_found error", () => {
    const error = dropboxError(409, { error_summary: "path/not_found/.." });

    expect(isPathNotFoundError(error)).toBe(true);
  });

  it("is false for other errors", () => {
    expect(
      isPathNotFoundError(dropboxError(409, { error_summary: "path/malformed_path/.." }))
    ).toBe(false);
    expect(isPathNotFoundError(dropboxError(500, "Internal Server Error"))).toBe(false);
    expect(isPathNotFoundError(new TypeError("Failed to fetch"))).toBe(false);
  });
});

describe("isPathConflictError", () => {
  it("is true when a file is already at the upload path", () => {
    const error = dropboxError(409, {
      error_summary: "path/conflict/file/..",
    });

    expect(isPathConflictError(error)).toBe(true);
  });

  it("is false for other errors", () => {
    expect(
      isPathConflictError(dropboxError(409, { error_summary: "path/not_found/.." }))
    ).toBe(false);
    expect(isPathConflictError(new TypeError("Failed to fetch"))).toBe(false);
  });
});

describe("isTransientError", () => {
  it("is true for errors that say nothing about the file", () => {
    expect(isTransientError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isTransientError(dropboxError(429, { error_summary: "too_many_requests/.." }))).toBe(true);
    expect(isTransientError(dropboxError(500, "Internal Server Error"))).toBe(true);
    expect(isTransientError(dropboxError(503, "Service Unavailable"))).toBe(true);
  });

  it("is false for errors about the file", () => {
    expect(isTransientError(dropboxError(409, { error_summary: "path/not_found/.." }))).toBe(false);
    expect(isTransientError(dropboxError(409, { error_summary: "unsupported_file/.." }))).toBe(false);
    expect(isTransientError(new Error("boom"))).toBe(false);
  });
});

describe("getMediaErrorMessage", () => {
  it("explains each audio element error", () => {
    expect(getMediaErrorMessage(MEDIA_ERROR.network)).toBe(
      "The download stopped. Check your connection."
    );
    expect(getMediaErrorMessage(MEDIA_ERROR.decode)).toBe(
      "This file is damaged or can't be read"
    );
    expect(getMediaErrorMessage(MEDIA_ERROR.notSupported)).toBe(
      "This file can't be played in the browser"
    );
    expect(getMediaErrorMessage(99)).toBe(DEFAULT_TRACK_ERROR);
  });
});
