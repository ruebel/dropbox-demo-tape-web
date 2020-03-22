import React, { Fragment, useState } from "react";
import styled from "styled-components";
import { Redirect } from "@reach/router";

import { useDropbox } from "./dropboxContext";

import Button from "./Button";
import ButtonLink from "./ButtonLink";
import TextInput from "./TextInput";

const Form = styled.form`
  display: grid;
  grid-gap: 20px;
  position: relative;
  width: 300px;
`;

const Wrapper = styled.div`
  align-items: center;
  display: grid;
  grid-gap: 20px;
  justify-content: center;
  padding: 40px;
`;

function Auth() {
  const {
    authHref,
    clientId,
    error,
    isAuthenticated,
    parseAcessToken,
    onClearClientId,
    onSaveClientId
  } = useDropbox();
  const [id, setId] = useState(clientId || "");

  function handleIdChange(value) {
    setId(value);
  }

  function handleSubmit(e) {
    if (id) {
      onSaveClientId(id);
      setId("");
    }
    e.preventDefault();
    return false;
  }

  if (!isAuthenticated && window.location.hash.includes("access_token")) {
    parseAcessToken();
  }

  if (isAuthenticated) {
    return <Redirect noThrow={true} to="/" />;
  }

  return (
    <Wrapper>
      <h1>Welcome</h1>
      {clientId ? (
        <Fragment>
          <ButtonLink disabled={!clientId} href={authHref}>
            Authenticate With Dropbox
          </ButtonLink>
          <Button onClick={onClearClientId}>Clear Dropbox Client Id</Button>
        </Fragment>
      ) : (
        <Form onSubmit={handleSubmit}>
          <TextInput
            error={error}
            hasError={error}
            onChange={handleIdChange}
            title="Dropbox Client Id"
            value={id}
          />
          <Button disabled={!id} type="submit">
            Save
          </Button>
        </Form>
      )}
    </Wrapper>
  );
}

export default Auth;
