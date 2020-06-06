export const HOME =
  process.env.NODE_ENV === "production" ? "/dropbox-demo-tape-web" : "/";

export const ERROR_URL = "https://hooks.zapier.com/hooks/catch/3498170/os51faz";

export function makeRelativeUrl(url) {
  if (process.env.NODE_ENV === "production") {
    return `${HOME}${url}`;
  }
  return url;
}
