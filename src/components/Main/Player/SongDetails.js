import React from "react";
import styled from "styled-components";

import PlaylistImage from "../../PlaylistImage";
import { removeExtension } from "../../../utils";

const Artist = styled.div`
  ${(p) => p.theme.typography.sub}
  color: ${(p) => p.theme.color.disabled};
`;

const Info = styled.div`
  display: grid;
  grid-gap: 2px;
`;

const TrackName = styled.div`
  ${(p) => p.theme.typography.base}
  font-weight: 500;
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
      <PlaylistImage playlist={playlist?.data} />
      <Info>
        <TrackName>{removeExtension(track?.name)}</TrackName>
        <Artist>
          {playlist?.data?.data?.artist || playlist?.data?.data?.title}
        </Artist>
      </Info>
    </Wrapper>
  );
}

export default SongDetails;
