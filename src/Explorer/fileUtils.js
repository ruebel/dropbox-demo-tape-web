/**
 * Get extension from file name
 * @param  {String} name File Name
 * @return {String}      Extension
 */
export function getExtension(name = "") {
  return name.split(".").pop();
}

export function getModifiedBy(entry) {
  return entry?.sharing_info?.modified_by;
}

/**
 * Get the modified_by user ids from a list of entries
 * @param  {Array<Object>} entries
 * @return {Array<string>} ids
 */
export function getModifiedUsersFromEntries(entries) {
  return [...new Set(entries.map(getModifiedBy))].filter(Boolean);
}

/**
 * Returns true if file name is an audio file
 * @param  {String}  name File Name
 * @return {Boolean}      isAudioFile
 */
export function isAudioFile(name) {
  return ["mp3", "m4a", "ovw", "wav"].includes(getExtension(name));
}

export function isImage(name) {
  return ["png", "jpg", "jpeg"].includes(getExtension(name));
}

export function isFile(entry) {
  return entry[".tag"] === "file";
}

export function isFolder(entry) {
  return entry[".tag"] === "folder";
}

export function isAudioFileOrFolder(entry) {
  return isFolder(entry) || (isFile(entry) && isAudioFile(entry.name));
}

export function isImageOrFolder(entry) {
  return isFolder(entry) || (isFile(entry) && isImage(entry.name));
}

/**
 * Returns true if file name is a demo tape playlist
 * @param  {String}  name File Name
 * @return {Boolean}      is playlist
 */
export function isPlaylist(name) {
  return getExtension(name) === "mix";
}

/**
 * Transform dropbox file object shape to shape usable by client
 * @param  {Object} file File object shape from dropbox
 * @return {Object}      Transformed file object
 */
export function transformFile(file) {
  return {
    ...file,
    isAudioFile: isAudioFile(file.name),
    isFolder: file[".tag"] === "folder",
    isPlaylist: isPlaylist(file.name),
    path: file.path_display,
    type: file[".tag"],
    user: getModifiedBy(file),
  };
}

export async function getFiles(dbx, folder = "", showFiles, showImages) {
  // Get folder listing
  const { cursor, entries, hasMore } = await dbx.filesListFolder({
    path: folder,
  });

  const fileFilter = showFiles
    ? isAudioFileOrFolder
    : showImages
    ? isImageOrFolder
    : isFolder;

  const payload = {
    cursor,
    data: entries.filter(fileFilter).map(transformFile),
    hasMore,
    path: folder,
  };

  return payload;
}

export function sortByTypeAndName(sortDir) {
  const dir = sortDir === "asc" ? -1 : 1;
  return function (a, b) {
    return (
      (a.type !== b.type && (a.type === "folder" || b.type === "folder")
        ? b.type === "folder"
          ? 1
          : -1
        : a.name.localeCompare(b.name)) * dir
    );
  };
}

export function sortByTypeAndModified(sortDir) {
  const dir = sortDir === "asc" ? -1 : 1;
  return function (a, b) {
    return (
      (a.type !== b.type && (a.type === "folder" || b.type === "folder")
        ? b.type === "folder"
          ? 1
          : -1
        : new Date(b.server_modified) - new Date(a.server_modified)) * dir
    );
  };
}

export function sortByTypeAndModifiedBy(sortDir) {
  const dir = sortDir === "asc" ? -1 : 1;
  return function (a, b) {
    return (
      (a.type !== b.type && (a.type === "folder" || b.type === "folder")
        ? b.type === "folder"
          ? 1
          : -1
        : a.user?.name?.display_name.localeCompare(
            b.user?.name?.display_name
          )) * dir
    );
  };
}
