import React from "react";
import styled from "styled-components";

import PlaylistImage from "../../PlaylistImage";
import { removeExtension } from "../../../utils";

const Artist = styled.div`
  ${(p) => p.theme.typography.sub}
  color: ${(p) => p.theme.color.secondary};
`;

const Info = styled.div`
  display: grid;
  grid-gap: 2px;
`;

const TrackName = styled.div`
  ${(p) => p.theme.typography.base}
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const Wrapper = styled.div`
  align-items: center;
  display: grid;
  grid-gap: 10px;
  grid-template-columns: 50px 1fr;
`;

function SongDetails({ playlist, track }) {
  return (
    <Wrapper>
      <PlaylistImage playlist={playlist} />
      <Info>
        <TrackName>{removeExtension(track?.name)}</TrackName>
        <Artist>{playlist?.data?.artist || playlist?.data?.title}</Artist>
      </Info>
    </Wrapper>
  );
}

export default SongDetails;
