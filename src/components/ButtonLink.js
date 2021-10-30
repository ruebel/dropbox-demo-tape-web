import React from "react";
import styled from "styled-components";
import { Link } from "@reach/router";

const Base = styled.a`
  align-items: center;
  background-color: ${(p) => p.theme.color.background};
  border-radius: 10px;
  border: 1px solid ${(p) => p.theme.color.white};
  color: ${(p) => p.theme.color.white};
  cursor: pointer;
  display: flex;
  font-size: 14px;
  justify-content: center;
  padding: 10px 20px;
  text-decoration: none;
  text-transform: uppercase;
  transition: ${(p) => p.theme.transition};

  :hover {
    background-color: ${(p) => p.theme.color.white};
    color: ${(p) => p.theme.color.background};
  }

  ${(p) =>
    p.disabled
      ? `
  color: ${p.theme.color.disabled};
  cursor: unset;
  border-color: ${p.theme.color.disabled};

  :hover {
    background-color: ${p.theme.color.background};
    color: ${p.theme.color.disabled};
  }
`
      : ""}
`;

function ButtonLink(props) {
  return <Base as={props.to ? Link : undefined} {...props} />;
}

export default ButtonLink;
