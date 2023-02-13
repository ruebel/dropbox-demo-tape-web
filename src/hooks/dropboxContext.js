import * as React from "react";
import { Dropbox, DropboxAuth } from "dropbox";
import { useCache } from "./cacheContext";

const DropboxContext = React.createContext();
const clientId = "ie394xarjsfdxr0";
const dbxAuth = new DropboxAuth({ clientId });
const REDIRECT_URI = `${window.location.origin}/auth`;

function DropboxProvider({ authUrl, children }) {
  const cache = useCache();
  const [currentUser, setCurrentUser] = React.useState(null);
  const [error, setError] = React.useState(null);
  const dbxRef = React.useRef(new Dropbox({ clientId }));
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [accessToken, setAccessToken] = React.useState(
    cache.getValue("accessToken")
  );
  const [refreshToken, setRefreshToken] = React.useState(
    cache.getValue("refreshToken")
  );

  // Gets Auth Href after client id is added
  const onAuth = React.useCallback(() => {
    async function getAuthUrl() {
      const href = await dbxAuth.getAuthenticationUrl(
        REDIRECT_URI,
        undefined,
        "code",
        "offline",
        undefined,
        undefined,
        true
      );

      if (href) {
        cache.setValue("codeVerifier", dbxAuth.codeVerifier);
        window.location.href = href;
      } else {
        setError("Invalid Dropbox Id");
      }
    }

    getAuthUrl();
    // eslint-disable-next-line
  }, []);

  // Gets current user's info if we don't have it already
  React.useEffect(() => {
    async function getCurrentUser() {
      try {
        const res = await dbxRef.current.usersGetCurrentAccount();
        const user = res?.result;
        setCurrentUser(user);
        cache.setValue("currentUser", user);
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Error getting user", e);
        token();
      }
    }

    async function token() {
      try {
        dbxAuth.setAccessToken(accessToken);
        dbxAuth.setRefreshToken(refreshToken);
        dbxAuth.setCodeVerifier(cache.getValue("codeVerifier"));
        const dbx = new Dropbox({ auth: dbxAuth });
        dbxRef.current = dbx;

        await dbxAuth.checkAndRefreshAccessToken();

        getCurrentUser();
      } catch (e) {
        console.error("Error refreshing token", e);
        setError(e);
      }
    }

    if (isAuthenticated && !currentUser) {
      getCurrentUser();
    } else if (!isAuthenticated && refreshToken) {
      token();
    }
    // eslint-disable-next-line
  }, [isAuthenticated, refreshToken]);

  function onLogout() {
    setIsAuthenticated(false);
    setCurrentUser(null);
    cache.resetCache({ clientId });
  }

  async function parseAcessToken() {
    // Get the access token from the query string
    const queryVars = new URLSearchParams(window.location.search);
    const code = queryVars.get("code");

    // This must match the code verifier we made the original auth url with
    const codeVerifier = cache.getValue("codeVerifier");

    if (!codeVerifier || !code) return;

    dbxAuth.setCodeVerifier(codeVerifier);
    const token = await dbxAuth.getAccessTokenFromCode(REDIRECT_URI, code);

    dbxAuth.setAccessToken(token.result.access_token);
    dbxAuth.setRefreshToken(token.result.refresh_token);

    // create a new dropbox token using the access token
    dbxRef.current = new Dropbox({ auth: dbxAuth });

    // Save the access token in memory and cache
    cache.setValue("accessToken", token.result.access_token);
    cache.setValue("refreshToken", token.result.refresh_token);
    setRefreshToken(refreshToken);
    setAccessToken(accessToken);
    setIsAuthenticated(true);
  }

  function onAuthError(error) {
    console.error("onAuthError", error);
    setIsAuthenticated(false);
  }

  const value = {
    accessToken,
    currentUser,
    dbx: dbxRef.current,
    error,
    isAuthenticated,
    onAuth,
    onLogout,
    onAuthError,
    parseAcessToken,
  };

  return (
    <DropboxContext.Provider value={value}>{children}</DropboxContext.Provider>
  );
}

function useDropbox() {
  const context = React.useContext(DropboxContext);
  if (context === undefined) {
    throw new Error("useCache must be used within a DropboxContext");
  }
  return context;
}

export { DropboxProvider, useDropbox };
