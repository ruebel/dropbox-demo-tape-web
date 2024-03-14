import { Playlist, PlaylistSortType, SortDir } from "@/utils/types";

export function sortPlaylists(
  playlists: Playlist[],
  sortType: PlaylistSortType,
  sortDir: SortDir = "desc"
) {
  const dir = sortDir === "asc" ? -1 : 1;
  return playlists.sort((a, b) => {
    switch (sortType) {
      case "artist":
        return a.data.artist.localeCompare(b.data.artist) * dir;
      case "title":
        return a.data.title.localeCompare(b.data.title) * dir;
      case "modified":
        return (
          (new Date(b.meta.server_modified).getTime() -
            new Date(a.meta.server_modified).getTime()) *
          dir
        );
    }
  });
}
