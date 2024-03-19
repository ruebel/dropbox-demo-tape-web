export function reorderList<T>(
  list: Array<T>,
  startIndex: number,
  endIndex: number
) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
}

export function replaceItemAtIndex<T>(
  arr: Array<T>,
  index: number,
  newValue: T
) {
  return [...arr.slice(0, index), newValue, ...arr.slice(index + 1)];
}
