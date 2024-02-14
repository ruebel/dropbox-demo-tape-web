# Dropbox Demo Tape

> A collaborative playlist app built on Dropbox

https://dropbox-demo-tape.vercel.app/

## Overview

- Create collaborative playlists in Dropbox
- Anyone with permissions to the file in Dropbox can collaborate

## Technology

- [React](https://react.dev/)
- [Typescript](https://www.typescriptlang.org/)
- [Jotai](https://jotai.org/)
- [NextJS](https://nextjs.org/)
- [Vercel](https://vercel.com/)

## Dropbox Client Id

You will need a dropbox client id

1. [Create an app](https://www.dropbox.com/developers/apps?)
2. Add `{your_deployment_url}/auth` to the `Redirct URIs`
3. Copy the App key and update the key in `./constants.ts`
