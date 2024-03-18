import { EnhancedFileMeta, FileMeta, SortDir, UserMap } from "@/utils/types";

export function getModifiedBy(entry: FileMeta) {
  return entry?.sharing_info?.modified_by || "";
}

export function getModifiedUsersFromEntries(entries: FileMeta[]) {
  return Array.from(new Set(entries.map(getModifiedBy))).filter(Boolean);
}

export function getExtension(name: string) {
  return name?.split(".")?.pop() || "";
}

export function getPathWithoutFileName(path: string) {
  return path.substring(0, path.lastIndexOf("/"));
}

/**
 * Returns true if file name is an audio file
 */
export function isAudioFile(name: string) {
  return ["mp3", "m4a", "ovw", "wav"].includes(getExtension(name));
}

export function isImage(name: string) {
  return ["png", "jpg", "jpeg"].includes(getExtension(name));
}

export function isFile(entry: FileMeta) {
  return entry[".tag"] === "file";
}

export function isFolder(entry: FileMeta) {
  return entry[".tag"] === "folder";
}

export function isAudioFileOrFolder(entry: FileMeta) {
  return isFolder(entry) || (isFile(entry) && isAudioFile(entry.name));
}

export function isImageOrFolder(entry: FileMeta) {
  return isFolder(entry) || (isFile(entry) && isImage(entry.name));
}

export function isPlaylist(name: string) {
  return getExtension(name) === "mix";
}

/**
 * Transform dropbox file object shape to shape usable by client
 * @param  {Object} file File object shape from dropbox
 * @return {Object}      Transformed file object
 */
export function transformFile(file: FileMeta): EnhancedFileMeta {
  return {
    ...file,
    isAudioFile: isAudioFile(file.name),
    isFolder: file[".tag"] === "folder",
    isPlaylist: isPlaylist(file.name),
    modifiedBy: getModifiedBy(file) || "",
    path: file.path_display || "",
    type: file[".tag"],
  };
}

export function removeExtension(fileName = "") {
  return fileName.substring(0, fileName.lastIndexOf("."));
}

export function sortByTypeAndName(sortDir: SortDir) {
  const dir = sortDir === "asc" ? -1 : 1;
  return function (a: EnhancedFileMeta, b: EnhancedFileMeta) {
    return (
      (a.type !== b.type && (a.type === "folder" || b.type === "folder")
        ? b.type === "folder"
          ? 1
          : -1
        : a.name.localeCompare(b.name)) * dir
    );
  };
}

export function sortByTypeAndModified(sortDir: SortDir) {
  const dir = sortDir === "asc" ? -1 : 1;
  return function (a: EnhancedFileMeta, b: EnhancedFileMeta) {
    return (
      (a.type !== b.type && (a.type === "folder" || b.type === "folder")
        ? b.type === "folder"
          ? 1
          : -1
        : // @ts-expect-error - TS doesn't like the date comparison
          new Date(b.server_modified) - new Date(a.server_modified)) * dir
    );
  };
}

export function sortByTypeAndModifiedBy(sortDir: SortDir, users: UserMap) {
  const dir = sortDir === "asc" ? -1 : 1;
  return function (a: EnhancedFileMeta, b: EnhancedFileMeta) {
    const userA = users[a.modifiedBy];
    const userB = users[b.modifiedBy];
    return (
      (a.type !== b.type && (a.type === "folder" || b.type === "folder")
        ? b.type === "folder"
          ? 1
          : -1
        : userA?.name?.display_name.localeCompare(userB?.name?.display_name)) *
      dir
    );
  };
}
