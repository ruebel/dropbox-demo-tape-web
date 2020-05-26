import React from "react";
import styled from "styled-components";
import { Redirect } from "@reach/router";

import Header from "./Header";
import Player from "./Player";
import { useDropbox } from "../dropboxContext";

const Content = styled.main`
  background-color: ${(p) => p.theme.color.background};
  overflow-y: scroll;
  padding-bottom: 113px;
`;

const Wrapper = styled.div`
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100vh;
  overflow: hidden;
`;

function Main({ children, location }) {
  const { isAuthenticated } = useDropbox();

  if (!isAuthenticated && !location.pathname.includes("/auth")) {
    return <Redirect noThrow={true} to="auth" />;
  }

  return (
    <Wrapper>
      <Header location={location} />
      <Content>{children}</Content>
      <Player />
    </Wrapper>
  );
}

export default Main;
