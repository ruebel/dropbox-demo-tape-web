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
  const dbx = React.useRef();

  React.useEffect(() => {
    if (clientId) {
      dbx.current = new Dropbox({ accessToken, clientId });
      const href = dbx.current.getAuthenticationUrl(authUrl);
      if (href) {
        setAuthHref(href);
      } else {
        setError("Invalid Dropbox Id");
      }
    }
    // eslint-disable-next-line
  }, [clientId]);

  React.useEffect(() => {
    async function getCurrentUser() {
      const user = await dbx.current.usersGetCurrentAccount();
      setCurrentUser(user);
      cache.setValue("currentUser", user);
    }

    if (accessToken && !currentUser) {
      getCurrentUser();
    }
    // eslint-disable-next-line
  }, [accessToken]);

  function onClearClientId() {
    setError(null);
    cache.setValue("clientId", null);
    setClientId(null);
  }

  function onLogout() {
    setAccessToken("");
    setCurrentUser(null);
    cache.resetCache({ clientId });
  }

  function onSaveClientId(clientId) {
    setError(null);
    cache.setValue("clientId", clientId);
    setClientId(clientId);
  }

  function parseAcessToken(url) {
    const { access_token } = parseQueryString(window.location.hash);
    dbx.current = new Dropbox({ accessToken: access_token });
    setAccessToken(access_token);
    cache.setValue("accessToken", access_token);
  }

  const value = {
    accessToken,
    authHref,
    clientId,
    currentUser,
    dbx: dbx.current,
    error,
    isAuthenticated: Boolean(accessToken),
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
