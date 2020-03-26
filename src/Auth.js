import React, { Fragment } from "react";
import styled from "styled-components";
import { Redirect } from "@reach/router";

import { useDropbox } from "./dropboxContext";
import { HOME } from "./constants";

import ButtonLink from "./ButtonLink";

const Wrapper = styled.div`
  align-items: center;
  display: grid;
  grid-gap: 20px;
  justify-content: center;
  padding: 40px;
`;

function Auth() {
  const { authHref, isAuthenticated, parseAcessToken } = useDropbox();

  if (!isAuthenticated && window.location.hash.includes("access_token")) {
    parseAcessToken();
  }

  if (isAuthenticated) {
    return <Redirect noThrow={true} to={HOME} />;
  }

  return (
    <Wrapper>
      <h1>Welcome</h1>
      <Fragment>
        <ButtonLink href={authHref}>Authenticate With Dropbox</ButtonLink>
      </Fragment>
    </Wrapper>
  );
}

export default Auth;
