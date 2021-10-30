import React from "react";
import styled from "styled-components";

import PlaylistImage from "./PlaylistImage";

const Artist = styled.div`
  ${(p) => p.theme.typography.sub}
  color: ${(p) => p.theme.color.disabled};
`;

const Info = styled.div`
  display: grid;
`;

const White = styled.span`
  color: ${(p) => p.theme.color.primary};
`;

const Wrapper = styled.div`
  display: grid;
  grid-gap: 20px;
  grid-template-columns: 50px 1fr;
`;

function PlaylistHeader({ playlist }) {
  return (
    <Wrapper>
      <PlaylistImage playlist={playlist} />
      <Info>
        <h1>{playlist.data.title}</h1>
        {playlist.data.artist && (
          <Artist>
            By <White>{playlist.data.artist}</White>
          </Artist>
        )}
      </Info>
    </Wrapper>
  );
}

export default PlaylistHeader;
