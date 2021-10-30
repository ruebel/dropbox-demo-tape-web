import React from "react";
import styled from "styled-components";

import PlaylistImage from "./PlaylistImage";
import { useSize } from "../hooks";

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

const Title = styled.h1`
  font-size: ${(p) => (p.size === "large" ? 32 : 24)}px;
`;

const Wrapper = styled.div`
  display: grid;
  grid-gap: ${(p) => (p.size === "large" ? 20 : 10)}px;
  grid-template-columns: 50px 1fr;
`;

function PlaylistHeader({ playlist }) {
  const size = useSize();

  return (
    <Wrapper size={size}>
      <PlaylistImage playlist={playlist} />
      <Info>
        <Title size={size}>{playlist.data.title}</Title>
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
