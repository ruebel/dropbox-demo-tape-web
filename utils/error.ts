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
 * Turns an error from loading a track into a short message to show the user.
 * The message is saved in the shared playlist file, so it includes at most
 * the Dropbox error code, never the response body or a stack trace.
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

    return summary ? `Dropbox error: ${summary}` : DEFAULT_TRACK_ERROR;
  }

  // fetch rejects with a TypeError when the request never reaches the server
  if (error instanceof TypeError) {
    return "Couldn't reach Dropbox. Check your connection.";
  }

  return DEFAULT_TRACK_ERROR;
}
