import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "@reach/router";

import Button from "./Button";
import ButtonLink from "./ButtonLink";
import Explorer from "./Explorer";
import PlaylistHeader from "./PlaylistHeader";

import { makeRelativeUrl } from "../constants";
import { usePlaylist, useSize } from "../hooks";

const Actions = styled.div`
  align-items: center;
  display: grid;
  grid-auto-flow: column;
  grid-gap: 20px;
`;

const Header = styled.div`
  display: grid;
  flex-direction: row;
  grid-gap: 20px;
  grid-template-columns: ${(p) => (p.size === "small" ? "1fr" : "1fr auto")};
  padding: 20px;
`;

function Tracks({ playlistId }) {
  const { data: playlist, isLoading, onSave } = usePlaylist({ playlistId });
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const navigate = useNavigate();
  const size = useSize();

  const playlistUrl = makeRelativeUrl(`/playlist/${playlistId}`);

  useEffect(() => {
    setSelectedTracks(playlist?.data?.tracks || []);
  }, [isLoading, playlist]);

  function handleSave() {
    onSave({
      ...playlist,
      data: {
        ...playlist.data,
        tracks: selectedTracks,
      },
    });
    navigate(playlistUrl);
  }

  function handleSelectionChange(tracks) {
    setSelectedTracks(tracks);
    if (!isDirty) {
      setIsDirty(true);
    }
  }

  return (
    <div>
      <Header size={size}>
        <PlaylistHeader playlist={playlist} />
        <Actions>
          <Button disabled={!isDirty} onClick={handleSave}>
            Save
          </Button>
          <ButtonLink to={playlistUrl}>Cancel</ButtonLink>
        </Actions>
      </Header>
      <Explorer
        onSelectionChange={handleSelectionChange}
        selectedEntries={selectedTracks}
        showFiles={true}
      />
    </div>
  );
}

export default Tracks;
