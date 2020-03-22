import React from "react";
import styled from "styled-components";

const Wrapper = styled.button`
  background-color: transparent;
  border: none;
  color: ${p => p.theme.color.primary};
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  padding: 10px;
  outline: none;

  :hover,
  :focus {
    color: ${p => p.theme.color.highlight};
  }
`;

const Breadcrumb = ({ name = "Home", onClick, path }) => {
  return <Wrapper onClick={() => onClick(path)}>{name}</Wrapper>;
};

export default Breadcrumb;
