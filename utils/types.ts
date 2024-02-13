import { files, users } from "dropbox";

export type MaybeString = string | undefined;

export type FileMeta = files.FileMetadata & {
  // This comes back with the file meta from Dropbox but is not in the type
  ".tag": string;
};

export type ImageMap = Record<string, string>;

export type EnhancedFileMeta = FileMeta & {
  isAudioFile: boolean;
  isFolder: boolean;
  isPlaylist: boolean;
  modifiedBy: string;
  path: string;
  type: string;
};

export type PlaylistTrack = EnhancedFileMeta;

export type PlaylistData = {
  artist: string;
  image?: EnhancedFileMeta | undefined;
  title: string;
  tracks: PlaylistTrack[];
};

export type Playlist = {
  data: PlaylistData;
  meta: EnhancedFileMeta;
};

export type UserMap = Record<string, users.BasicAccount>;

export type DTStorage = {
  accessToken?: MaybeString;
  codeVerifier?: MaybeString;
  loading?: boolean;
  playlists?: Playlist[];
  refreshToken?: MaybeString;
  users?: UserMap;
};

export type SortDir = "asc" | "desc";

export type AudioState = "loading" | "paused" | "playing" | "stopped";
