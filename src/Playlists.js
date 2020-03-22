import React from "react";
import styled from "styled-components";
import formatRelative from "date-fns/formatRelative";

import ButtonLink from "./ButtonLink";
import Link from "./Link";
import List from "./List";
import Loader from "./Loader";

import usePlaylists from "./usePlaylists";

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 20px;
`;

const Name = styled.h2``;

const Modified = styled.div`
  color: ${p => p.theme.color.disabled};
`;

const Updated = styled.span`
  ${p => p.theme.typography.sub}
  text-align: right;
`;

const Path = styled.span`
  ${p => p.theme.typography.sub}
  color: ${p => p.theme.color.secondary};
`;

const Playlist = styled.div`
  ${p => p.theme.typography.base}
  align-items: center;
  background-color: ${p =>
    p.theme.color[p.isPlaying ? "bgHighlight" : "background"]};
  border: none;
  border-top: 1px solid ${p => p.theme.color.bgHighlight};
  color: ${p => p.theme.color[p.isPlaying ? "highlight" : "inherit"]};
  cursor: pointer;
  display: grid;
  grid-template-columns: 1fr auto;
  line-height: 30px;
  outline: none;
  padding: ${p => p.theme.space.medium}px ${p => p.theme.space.large}px;
  text-align: left;

  :hover {
    background-color: ${p => p.theme.color.primary}11;
  }
`;

const Title = styled.div`
  display: grid;
`;

function Playlists() {
  const playlists = usePlaylists({ forceRefresh: true });

  return (
    <div>
      <Actions>
        <ButtonLink to="new">Add</ButtonLink>
      </Actions>
      <Loader isLoading={playlists.isLoading} />
      <List
        getKey={playlist => playlist.meta.id}
        items={playlists.data}
        itemRenderer={playlist => {
          const modifiedBy = playlist.meta.user?.name?.display_name;
          return (
            <Link to={`/playlist/${playlist.meta.id}`}>
              <Playlist>
                <Title>
                  <Name>{playlist.data.title}</Name>
                  {
                    <Path>
                      {playlist.data.artist || playlist.meta.path_display}
                    </Path>
                  }
                </Title>
                <Updated>
                  Updated{" "}
                  {formatRelative(
                    new Date(playlist.meta.server_modified),
                    new Date()
                  )}
                  <Modified>
                    {Boolean(modifiedBy) ? "by " : ""}
                    {modifiedBy}
                  </Modified>
                </Updated>
              </Playlist>
            </Link>
          );
        }}
      />
    </div>
  );
}

export default Playlists;
