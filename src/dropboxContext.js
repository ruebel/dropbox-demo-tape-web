import * as React from "react";
import { Dropbox } from "dropbox";
import parseQueryString from "./parseQueryString";
import { useCache } from "./cacheContext";

const DropboxContext = React.createContext();

const clientId = "ie394xarjsfdxr0";

function DropboxProvider({ authUrl, children }) {
  const cache = useCache();
  const [currentUser, setCurrentUser] = React.useState(
    cache.getValue("currentUser")
  );
  const [error, setError] = React.useState(null);
  const [accessToken, setAccessToken] = React.useState(
    cache.getValue("accessToken")
  );
  const [authHref, setAuthHref] = React.useState(null);
  const [dbx, setDbx] = React.useState(null);

  // Gets Auth Href after client id is added
  React.useEffect(() => {
    async function getAuthUrl() {
      const currentDbx = new Dropbox({ accessToken, clientId });
      setDbx(currentDbx);
      const href = await currentDbx.auth.getAuthenticationUrl(authUrl);
  
      if (href) {
        setAuthHref(href);
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
      const user = await dbx.usersGetCurrentAccount();
      setCurrentUser(user);
      cache.setValue("currentUser", user);
    }

    if (accessToken && !currentUser && dbx) {
      getCurrentUser();
    }
    // eslint-disable-next-line
  }, [accessToken, dbx]);

  function onLogout() {
    setAccessToken("");
    setCurrentUser(null);
    setDbx(null);
    cache.resetCache({ clientId });
  }

  function parseAcessToken(url) {
    // Get the access token from the query string
    const { access_token } = parseQueryString(window.location.hash);

    // create a new dropbox token using the access token
    setDbx(new Dropbox({ accessToken: access_token, clientId }));

    // Save the access token in memory and cache
    cache.setValue("accessToken", access_token);
    setAccessToken(access_token);
  }

  const value = {
    accessToken,
    authHref,
    currentUser,
    dbx,
    error,
    isAuthenticated: dbx?.auth?.accessToken,
    onLogout,
    parseAcessToken
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
