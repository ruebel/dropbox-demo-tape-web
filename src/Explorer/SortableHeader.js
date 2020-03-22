import React from "react";
import styled from "styled-components";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";

const Wrapper = styled.button`
  align-items: center;
  background-color: transparent;
  border: none;
  color: ${p => p.theme.color.primary};
  cursor: pointer;
  display: flex;
  flex-direction: row;
  font-size: 14px;
  font-weight: 700;
  line-height: 27px;
  margin: 0;
  outline: none;
  padding: 0;

  :hover,
  :focus {
    color: ${p => p.theme.color.highlight};
  }
`;

function SortableHeader({ children, onClick, sortDir }) {
  const Icon =
    sortDir === "asc" ? ExpandMore : sortDir === "desc" ? ExpandLess : null;

  return (
    <Wrapper onClick={onClick}>
      <span>{children}</span>
      {Icon && <Icon />}
    </Wrapper>
  );
}

export default SortableHeader;
