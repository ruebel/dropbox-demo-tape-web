"use client";

import { getCurrentUser } from "@/api/user";
import {
  accessTokenAtom,
  authErrorAtom,
  authPendingAtom,
  codeVerifierAtom,
  dbxAtom,
  dbxAuthAtom,
  isAuthenticatedAtom,
  isStorageLoadingAtom,
  refreshTokenAtom,
} from "@/state/dropbox";
import { currentUserAtom } from "@/state/users";
import { makeRelativeUrl } from "@/utils/url";
import { Dropbox } from "dropbox";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";

function getRedirectUrl(baseUrl: string) {
  return `${baseUrl}${makeRelativeUrl("/auth")}`;
}

type TokenResult = {
  access_token: string;
  account_id: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  uid: string;
};

export function useDropboxAuth() {
  const [dbx, setDbx] = useAtom(dbxAtom);
  const [dbxAuth] = useAtom(dbxAuthAtom);
  const setError = useSetAtom(authErrorAtom);
  const [codeVerifier, setCodeVerifier] = useAtom(codeVerifierAtom);
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const [isAuthenticated, setIsAuthenticated] = useAtom(isAuthenticatedAtom);
  const [accessToken, setAccessToken] = useAtom(accessTokenAtom);
  const [refreshToken, setRefreshToken] = useAtom(refreshTokenAtom);
  const [authPending, setAuthPending] = useAtom(authPendingAtom);
  const isStorageLoading = useAtomValue(isStorageLoadingAtom);

  // Gets Auth Href after client id is added
  const onAuth = useCallback((baseUrl: string) => {
    async function getAuthUrl(baseUrl: string) {
      const href = await dbxAuth.getAuthenticationUrl(
        getRedirectUrl(baseUrl),
        undefined,
        "code",
        "offline",
        undefined,
        undefined,
        true
      );

      if (href) {
        const newCodeVerifier = dbxAuth.getCodeVerifier();
        setCodeVerifier(newCodeVerifier);
        return href;
      } else {
        setError("Invalid Dropbox Id");
      }
    }

    return getAuthUrl(baseUrl);
    // eslint-disable-next-line
  }, []);

  // Gets current user's info if we don't have it already
  useEffect(() => {
    async function getCurrentUserAsync(passedDbx?: Dropbox) {
      try {
        const user = await getCurrentUser(passedDbx || dbx);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Error getting user", e);
        token();
      }
    }

    async function token() {
      try {
        dbxAuth.setAccessToken(accessToken || "");
        dbxAuth.setRefreshToken(refreshToken || "");
        dbxAuth.setCodeVerifier(codeVerifier || "");

        await dbxAuth.checkAndRefreshAccessToken();

        const newDbx = new Dropbox({ auth: dbxAuth });
        setDbx(newDbx);

        getCurrentUserAsync(newDbx);
      } catch (e: Error | unknown) {
        console.error("Error refreshing token", e);
        setError((e as Error).toString());
        setAuthPending(false);
      }
    }

    if (isAuthenticated && !currentUser) {
      getCurrentUserAsync();
    } else if (!isAuthenticated && refreshToken) {
      token();
    } else if (!isAuthenticated && currentUser) {
      setIsAuthenticated(true);
    } else if (!isAuthenticated && !isStorageLoading) {
      setAuthPending(false);
    }
    // eslint-disable-next-line
  }, [isAuthenticated, refreshToken, isStorageLoading]);

  async function parseAcessToken(code: string, baseUrl: string) {
    if (!codeVerifier || !code) return;

    dbxAuth.setCodeVerifier(codeVerifier);
    const token = await dbxAuth.getAccessTokenFromCode(
      getRedirectUrl(baseUrl),
      code
    );

    dbxAuth.setAccessToken((token.result as TokenResult).access_token);
    dbxAuth.setRefreshToken((token.result as TokenResult).refresh_token);

    // create a new dropbox token using the access token
    const newDbx = new Dropbox({ auth: dbxAuth });
    setDbx(newDbx);

    // Save the access token in memory and cache
    setAccessToken((token.result as TokenResult).access_token);
    setRefreshToken((token.result as TokenResult).refresh_token);
    setIsAuthenticated(true);
  }

  return {
    isPending: authPending,
    onAuth,
    parseAcessToken,
  };
}
