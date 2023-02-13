import React, { Fragment, useEffect } from "react";
import styled from "styled-components";
import { Redirect } from "@reach/router";

import { useDropbox } from "../hooks";
import { HOME } from "../constants";

import ButtonLink from "./ButtonLink";

const Wrapper = styled.div`
  align-items: center;
  display: grid;
  grid-gap: 20px;
  justify-content: center;
  padding: 40px;
  text-align: center;
`;

function Auth() {
  const { isAuthenticated, onAuth, parseAcessToken } = useDropbox();
  const hasCode = window.location.search.includes("code");

  useEffect(() => {
    if (!isAuthenticated && hasCode) {
      parseAcessToken();
    }
  }, [hasCode, isAuthenticated, parseAcessToken]);

  if (isAuthenticated) {
    return <Redirect noThrow={true} to={HOME} />;
  }

  return (
    <Wrapper>
      <h1>Welcome</h1>
      <Fragment>
        <ButtonLink onClick={onAuth}>Authenticate With Dropbox</ButtonLink>
      </Fragment>
    </Wrapper>
  );
}

export default Auth;
