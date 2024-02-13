const PLAYLIST_URL = "/playlist";

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
