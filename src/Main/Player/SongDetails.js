import React from "react";
import styled from "styled-components";

import { removeExtension } from "../../utils";

const Artist = styled.div`
  ${p => p.theme.typography.sub}
  color: ${p => p.theme.color.disabled};
`;

const TrackName = styled.div`
  ${p => p.theme.typography.base}
  font-weight: 500;
`;

const Wrapper = styled.div`
  display: grid;
  grid-gap: 2px;
`;

function SongDetails({ playlist, track }) {
  return (
    <Wrapper>
      <TrackName>{removeExtension(track?.name)}</TrackName>
      <Artist>
        {playlist?.data?.data?.author || playlist?.data?.data?.title}
      </Artist>
    </Wrapper>
  );
}

export default SongDetails;
