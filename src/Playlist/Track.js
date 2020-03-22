import React from "react";
import styled from "styled-components";
import formatRelative from "date-fns/formatRelative";

import IconButton from "../IconButton";

import Delete from "@material-ui/icons/Delete";
import Headset from "@material-ui/icons/Headset";
import PlayArrow from "@material-ui/icons/PlayArrow";

import { removeExtension } from "../utils";

const Inner = styled.div`
  align-items: center;
  display: grid;
  line-height: 30px;
  grid-gap: 5px;
  grid-template-columns: 40px 20px 1fr auto;
  padding: ${p => p.theme.space.medium}px;
`;

const Play = styled.span`
  align-items: center;
  border: 1px solid transparent;
  border-radius: 50%;
  color: ${p => (p.isPlaying ? "white" : "transparent")};
  display: flex;
  height: 30px;
  justify-content: center;
  line-height: 30px;
  width: 30px;
`;

const Updated = styled.span`
  color: ${p => p.theme.color.secondary};
  font-size: 11px;
`;

const Wrapper = styled.button`
${p => p.theme.typography.base}
background-color: ${p =>
  p.theme.color[p.isPlaying ? "bgHighlight" : "background"]};
  border: none;
  border-top: 1px solid ${p => p.theme.color.bgHighlight};
  color: ${p => p.theme.color[p.isPlaying ? "highlight" : "inherit"]};
  cursor: pointer;
  outline: none;
  text-align: left;
  width: 100%;
  
  :hover {
    background-color: ${p => p.theme.color.primary}11;
    
    #play {
      border-color: white;
      color: white;
    }
  }
`;

function Track({
  index,
  isEditable,
  isPlaying,
  onClick,
  onDelete,
  track,
  user
}) {
  return (
    <Wrapper
      isPlaying={isPlaying}
      onClick={isEditable ? undefined : () => onClick(track)}
    >
      <Inner>
        {isEditable ? (
          <IconButton onClick={() => onDelete(track)}>
            <Delete fontSize="small" />
          </IconButton>
        ) : (
          <Play id="play" isPlaying={isPlaying}>
            {isPlaying ? (
              <Headset fontSize="small" />
            ) : (
              <PlayArrow fontSize="small" />
            )}
          </Play>
        )}
        <span>{index}.</span>
        <span>{removeExtension(track.name)}</span>
        {isEditable ? (
          <div />
        ) : (
          <Updated>
            Updated{" "}
            {formatRelative(new Date(track.server_modified), new Date())}
            {user ? ` by ${user.name.display_name}` : ""}
          </Updated>
        )}
      </Inner>
    </Wrapper>
  );
}

export default Track;
