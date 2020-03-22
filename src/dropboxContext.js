import * as React from "react";
import { Dropbox } from "dropbox";
import parseQueryString from "./parseQueryString";
import { useCache } from "./cacheContext";

const DropboxContext = React.createContext();

function DropboxProvider({ authUrl, children }) {
  const cache = useCache();
  const [clientId, setClientId] = React.useState(cache.getValue("clientId"));
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
    if (clientId) {
      const currentDbx = new Dropbox({ accessToken, clientId });
      setDbx(currentDbx);
      const href = currentDbx.getAuthenticationUrl(authUrl);
      if (href) {
        setAuthHref(href);
      } else {
        setError("Invalid Dropbox Id");
      }
    }
    // eslint-disable-next-line
  }, [clientId]);

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

  function onClearClientId() {
    setError(null);
    cache.setValue("clientId", null);
    setClientId(null);
  }

  function onLogout() {
    setAccessToken("");
    setCurrentUser(null);
    setDbx(null);
    cache.resetCache({ clientId });
  }

  function onSaveClientId(clientId) {
    setError(null);
    cache.setValue("clientId", clientId);
    setClientId(clientId);
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
    clientId,
    currentUser,
    dbx,
    error,
    isAuthenticated: dbx?.accessToken,
    onClearClientId,
    onLogout,
    onSaveClientId,
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
