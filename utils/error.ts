import { DropboxResponseError } from "dropbox";

export const DEFAULT_TRACK_ERROR = "Failed to load track";

// The Dropbox API returns a JSON body like
// { "error_summary": "path/not_found/..", "error": { ... } }
// but a non-JSON body comes through as a plain string
function getErrorSummary(error: DropboxResponseError<unknown>) {
  const body = error.error as { error_summary?: unknown } | string | undefined;

  if (typeof body === "object" && typeof body?.error_summary === "string") {
    // Drops the trailing dots Dropbox adds: "path/not_found/.." -> "path/not_found"
    return body.error_summary.replace(/[/.]+$/, "");
  }

  return "";
}

/**
 * Whether Dropbox could not find a file at the requested path
 */
export function isPathNotFoundError(error: unknown) {
  return (
    error instanceof DropboxResponseError &&
    getErrorSummary(error).startsWith("path/not_found")
  );
}

/**
 * Whether Dropbox no longer accepts a folder cursor, so the folder must be
 * listed again to get a new one
 */
export function isCursorResetError(error: unknown) {
  return (
    error instanceof DropboxResponseError &&
    getErrorSummary(error).startsWith("reset")
  );
}

// MediaError codes from the audio element (MediaError.MEDIA_ERR_*)
export const MEDIA_ERROR = {
  aborted: 1,
  network: 2,
  decode: 3,
  notSupported: 4,
} as const;

/**
 * Turns the audio element's error code into a short message to show the user
 */
export function getMediaErrorMessage(code: number) {
  switch (code) {
    case MEDIA_ERROR.network:
      return "The download stopped. Check your connection.";
    case MEDIA_ERROR.decode:
      return "This file is damaged or can't be read";
    case MEDIA_ERROR.notSupported:
      return "This file can't be played in the browser";
    default:
      return DEFAULT_TRACK_ERROR;
  }
}

/**
 * Whether the error says nothing about the file itself, so trying again later
 * may work: the request never reached Dropbox, Dropbox is limiting requests
 * (429), or Dropbox had a server error (5xx). These are not saved in the
 * shared playlist, so one person's bad connection does not mark the track as
 * failed for everyone.
 */
export function isTransientError(error: unknown) {
  if (error instanceof DropboxResponseError) {
    return error.status === 429 || error.status >= 500;
  }

  // fetch rejects with a TypeError when the request never reaches the server
  return error instanceof TypeError;
}

/**
 * Turns an error from loading a track into a short message to show the user.
 * The message can be saved in the shared playlist file, so it includes at
 * most the Dropbox error code, never the response body or a stack trace.
 */
export function getTrackErrorMessage(error: unknown) {
  if (isPathNotFoundError(error)) {
    return "This file was moved or deleted in Dropbox";
  }

  if (error instanceof DropboxResponseError) {
    const summary = getErrorSummary(error);

    if (error.status === 429) {
      return "Dropbox is limiting requests. Try again in a minute.";
    }

    if (error.status >= 500) {
      return "Dropbox is having trouble. Try again later.";
    }

    return summary ? `Dropbox error: ${summary}` : DEFAULT_TRACK_ERROR;
  }

  // fetch rejects with a TypeError when the request never reaches the server
  if (error instanceof TypeError) {
    return "Couldn't reach Dropbox. Check your connection.";
  }

  return DEFAULT_TRACK_ERROR;
}
