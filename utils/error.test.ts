import { DropboxResponseError } from "dropbox";
import { describe, expect, it } from "vitest";

import { DEFAULT_TRACK_ERROR, getTrackErrorMessage } from "@/utils/error";

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
    const error = dropboxError(500, "Internal Server Error");

    expect(getTrackErrorMessage(error)).toBe(DEFAULT_TRACK_ERROR);
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
