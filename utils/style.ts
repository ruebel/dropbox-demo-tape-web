export function styleArray(styles: Array<string | boolean>) {
  return styles.filter(Boolean).join(" ");
}
