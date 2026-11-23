import { HOME } from "@/utils/constants";

const PLAYLIST_URL = "/playlist";

/**
 * Where the header's back arrow goes from a page: the page one level up, such
 * as a playlist from its edit page. Goes home from a playlist and from the
 * new playlist page, because "/playlist" has no page.
 */
export function getBackUrl(pathname: string) {
  const parent = pathname.slice(0, pathname.lastIndexOf("/"));
  return parent === "" || parent === PLAYLIST_URL ? HOME : parent;
}

export function makeRelativeUrl(url: string) {
  if (process.env.NODE_ENV === "production") {
    return `${url}`;
  }
  return url;
}

export function playlistUrl(playlistId: string) {
  return makeRelativeUrl(`${PLAYLIST_URL}/${encodeURIComponent(playlistId)}`);
}

export function editPlaylistUrl(playlistId: string) {
  return `${playlistUrl(playlistId)}/edit`;
}

export function editPlaylistTracksUrl(playlistId: string) {
  return `${editPlaylistUrl(playlistId)}/tracks`;
}

export function editPlaylistImageUrl(playlistId: string) {
  return `${editPlaylistUrl(playlistId)}/image`;
}
