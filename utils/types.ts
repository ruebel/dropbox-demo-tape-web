import { files, users } from "dropbox";

export type MaybeString = string | undefined;

export type FileMeta = files.FileMetadata & {
  // This comes back with the file meta from Dropbox but is not in the type
  ".tag": string;
};

export type ImageMap = Record<string, string>;

// Why a track failed to load, for the app to act on. `error` holds the
// message for the user.
export type TrackErrorCode = "not_found";

export type EnhancedFileMeta = FileMeta & {
  duration?: number;
  error?: string;
  errorCode?: TrackErrorCode;
  isAudioFile: boolean;
  isFolder: boolean;
  isPlaylist: boolean;
  modifiedBy: string;
  path: string;
  type: string;
};

export type PlaylistTrack = EnhancedFileMeta;

// How a folder playlist orders its tracks. "name" keeps them in file name
// order. "custom" keeps the order the user set and adds new files at the end.
export type FolderSort = "name" | "custom";

// The Dropbox folder a folder playlist shows the audio files of
export type PlaylistFolder = {
  // The folder id, so the playlist still works when the folder moves
  id: string;
  // Whether audio files in subfolders, at any depth, are in the playlist too.
  // Playlists saved before this option have no value, which means false.
  includeSubfolders?: boolean;
  // For display only
  path: string;
  sort: FolderSort;
};

export type PlaylistData = {
  artist: string;
  // Set for a folder playlist, whose tracks come from this folder
  folder?: PlaylistFolder;
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

export type PlaylistSortType = "artist" | "title" | "modified";
