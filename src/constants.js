export const HOME =
  process.env.NODE_ENV === "production" ? "/dropbox-demo-tape-web" : "/";

export function makeRelativeUrl(url) {
  if (process.env.NODE_ENV === "production") {
    return `${HOME}${url}`;
  }
  return url;
}
