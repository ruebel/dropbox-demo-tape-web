export function getPlaylistId(playlist) {
  return playlist.meta.id;
}

export function removeExtension(fileName = "") {
  return fileName.substring(0, fileName.lastIndexOf("."));
}

export function reorderList(list, startIndex, endIndex) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
}

export function updateItemInListById(list, id, getId, newItem) {
  return list.map(l => (getId(l) === id ? newItem : l));
}
