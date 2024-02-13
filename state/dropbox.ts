import { DROPBOX_CLIENT_ID } from "@/utils/constants";
import { DTStorage, MaybeString } from "@/utils/types";
import { Dropbox, DropboxAuth } from "dropbox";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const dbxAtom = atom<Dropbox>(
  new Dropbox({ clientId: DROPBOX_CLIENT_ID })
);

export const dbxAuthAtom = atom<DropboxAuth>(
  new DropboxAuth({ clientId: DROPBOX_CLIENT_ID })
);

export const rootStorageAtom = atomWithStorage<DTStorage>("dt", {
  // This will go to undefined once storage has loaded so we know
  // when we've hydrated from the local cache
  loading: true,
});

export const refreshTokenAtom = atom(
  (get) => get(rootStorageAtom)?.refreshToken,
  (get, set, refreshToken: MaybeString) => {
    const root = get(rootStorageAtom);
    set(rootStorageAtom, { ...root, refreshToken });
  }
);

export const accessTokenAtom = atom(
  (get) => get(rootStorageAtom)?.accessToken,
  (get, set, accessToken: MaybeString) => {
    const root = get(rootStorageAtom);
    set(rootStorageAtom, { ...root, accessToken });
  }
);

export const codeVerifierAtom = atom(
  (get) => get(rootStorageAtom)?.codeVerifier,
  (get, set, codeVerifier: MaybeString) => {
    const root = get(rootStorageAtom);
    set(rootStorageAtom, { ...root, codeVerifier });
  }
);

export const isStorageLoadingAtom = atom(
  (get) => get(rootStorageAtom)?.loading
);

export const isAuthenticatedAtom = atom(false);

export const authErrorAtom = atom<string | null>(null);

export const authPendingAtom = atom(true);
