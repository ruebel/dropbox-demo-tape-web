import React from "react";
import { Router } from "@reach/router";
import { ThemeProvider } from "styled-components";
import {
  ThemeProvider as MuiThemeProvider,
  createMuiTheme
} from "@material-ui/core/styles";
import blue from "@material-ui/core/colors/blue";

import { AudioProvider } from "./audioContext";
import { CacheProvider } from "./cacheContext";
import { DropboxProvider } from "./dropboxContext";
import theme from "./theme";

import Auth from "./Auth";
import AddPlaylist from "./AddPlaylist";
import Home from "./Home";
import Main from "./Main";
import Playlist from "./Playlist";
import Tracks from "./Tracks";

const muiTheme = createMuiTheme({
  palette: {
    primary: blue
  }
});

function App() {
  return (
    <MuiThemeProvider theme={muiTheme}>
      <ThemeProvider theme={theme}>
        <CacheProvider>
          <DropboxProvider authUrl={`${window.location.href}`}>
            <AudioProvider>
              <Router>
                <Main path="/">
                  <Auth path="auth" />
                  <AddPlaylist path="new" />
                  <Playlist path="playlist/:playlistId" />
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
