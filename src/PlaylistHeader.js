import React from "react";
import styled from "styled-components";

const Artist = styled.div`
  ${p => p.theme.typography.sub}
  color: ${p => p.theme.color.disabled};
`;

const Info = styled.div`
  display: grid;
`;

const White = styled.span`
  color: ${p => p.theme.color.primary};
`;

function PlaylistHeader({ playlist }) {
  return (
    <Info>
      <h1>{playlist.data.title}</h1>
      {playlist.data.artist && (
        <Artist>
          By <White>{playlist.data.artist}</White>
        </Artist>
      )}
    </Info>
  );
}

export default PlaylistHeader;
