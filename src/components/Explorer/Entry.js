import React from "react";
import styled from "styled-components";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import Audiotrack from "@material-ui/icons/Audiotrack";
import CheckBox from "@material-ui/icons/CheckBox";
import Folder from "@material-ui/icons/Folder";

const Inner = styled.div`
  align-items: center;
  display: grid;
  grid-gap: 20px;
  grid-template-columns: 20px 1fr 0.5fr 0.5fr;
`;

const Name = styled.span`
  ${p => p.theme.typography.base}
`;

const Subtitle = styled.span`
  ${p => p.theme.typography.sub}
`;

const Wrapper = styled.button`
  background-color: ${p =>
    p.theme.color[p.isSelected ? "bgHighlight" : "background"]};
  border: none;
  border-top: 1px solid ${p => p.theme.color.bgHighlight};
  color: ${p => p.theme.color[p.isSelected ? "highlight" : "inherit"]};
  cursor: pointer;
  height: 61px;
  outline: none;
  padding: ${p => p.theme.space.medium}px ${p => p.theme.space.large}px;
  text-align: left;
  width: 100%;

  :hover {
    background-color: ${p => p.theme.color.primary}11;
  }
`;

function Entry({ entry, onClick, isSelected = false }) {
  const Icon = isSelected ? CheckBox : entry.isFolder ? Folder : Audiotrack;

  return (
    <Wrapper isSelected={isSelected} onClick={() => onClick(entry)}>
      <Inner>
        <Icon />
        <Name>{entry.name}</Name>
        {entry.type === "file" && (
          <Subtitle>
            {formatDistanceToNow(new Date(entry.server_modified))} ago
          </Subtitle>
        )}
        {entry.type === "file" && (
          <Subtitle>{entry.user?.name?.display_name}</Subtitle>
        )}
      </Inner>
    </Wrapper>
  );
}

export default Entry;
