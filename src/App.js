import React from "react";
import { Router } from "@reach/router";
import { ThemeProvider } from "styled-components";
import {
  ThemeProvider as MuiThemeProvider,
  createMuiTheme,
} from "@material-ui/core/styles";
import blue from "@material-ui/core/colors/blue";

import { AudioProvider } from "./audioContext";
import { CacheProvider } from "./cacheContext";
import { DropboxProvider } from "./dropboxContext";
import { HOME } from "./constants";
import theme from "./theme";

import Auth from "./Auth";
import AddPlaylist from "./AddPlaylist";
import ImageExplorer from "./ImageExplorer";
import Home from "./Home";
import Main from "./Main";
import Playlist from "./Playlist";
import Tracks from "./Tracks";

const muiTheme = createMuiTheme({
  palette: {
    primary: blue,
  },
});

function getAuthUrl() {
  // /auth will be in prod but not local so try to strip it
  // and the trailing slash that could be there
  const base = window.location.href.replace("/auth", "").replace(/\/$/, "");
  return `${base}/auth`;
}

function App() {
  return (
    <MuiThemeProvider theme={muiTheme}>
      <ThemeProvider theme={theme}>
        <CacheProvider>
          <DropboxProvider authUrl={getAuthUrl()}>
            <AudioProvider>
              <Router basepath={HOME}>
                <Main path="/">
                  <Auth path="auth" />
                  <AddPlaylist path="new" />
                  <Playlist path="playlist/:playlistId" />
                  <ImageExplorer path="playlist/:playlistId/image" />
                  <Tracks path="playlist/:playlistId/tracks" />
                  <Home path="/" />
                </Main>
              </Router>
            </AudioProvider>
          </DropboxProvider>
        </CacheProvider>
      </ThemeProvider>
    </MuiThemeProvider>
  );
}

export default App;
