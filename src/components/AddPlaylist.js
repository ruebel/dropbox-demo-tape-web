import React, { useState } from "react";
import styled from "styled-components";

import Button from "./Button";
import ButtonLink from "./ButtonLink";
import Explorer from "./Explorer";
import TextInput from "./TextInput";

import { HOME, makeRelativeUrl } from "../constants";
import { usePlaylists } from "../hooks";

const ExplorerInner = styled.div`
  overflow-y: scroll;
  height: 470px;
`;

const ExplorerTitle = styled.div`
  background-color: ${(p) => p.theme.color.background};
  font-size: 12px;
  font-weight: 600;
  left: 10px;
  padding: 0 5px;
  position: absolute;
  top: -6px;
`;

const ExplorerWrapper = styled.div`
  border: 1px solid ${(p) => p.theme.color.primary};
  border-radius: 10px;
  max-height: 480px;
  padding: 5px;
  position: relative;
`;

const Header = styled.div`
  align-items: center;
  display: grid;
  grid-template-columns: 1fr auto auto;
  grid-gap: 20px;
  margin-bottom: 20px;
`;

const Title = styled.h2``;

const Wrapper = styled.form`
  display: grid;
  grid-gap: 20px;
  padding: 20px;
`;

function AddPlaylist({ navigate }) {
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [path, setPath] = useState("/");
  const { onCreatePlaylist } = usePlaylists({});

  const canSave = !!artist && !!title && !!path;

  async function handleSave(e) {
    e.preventDefault();

    const playlistId = await onCreatePlaylist(`${path}/${title}.mix`, {
      artist,
      title,
      tracks: [],
    });

    navigate(makeRelativeUrl(`/playlist/${playlistId}`));

    return false;
  }

  return (
    <Wrapper onSubmit={canSave ? handleSave : undefined}>
      <Header>
        <Title>Add Playlist</Title>
        <Button disabled={!canSave} type="submit">
          Save
        </Button>
        <ButtonLink to={HOME}>Cancel</ButtonLink>
      </Header>
      <TextInput onChange={setTitle} title="Title" value={title} />
      <TextInput onChange={setArtist} title="Artist" value={artist} />
      <ExplorerWrapper>
        <ExplorerInner>
          <Explorer onPathChange={setPath} />
        </ExplorerInner>
        <ExplorerTitle>Location</ExplorerTitle>
      </ExplorerWrapper>
    </Wrapper>
  );
}

export default AddPlaylist;
