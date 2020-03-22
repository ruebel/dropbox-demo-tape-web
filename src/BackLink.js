import React from "react";
import styled from "styled-components";
import Link from "./Link";
import ArrowBackIos from "@material-ui/icons/ArrowBackIos";

const StyledLink = styled(Link)`
  align-items: center;
  display: grid;
  justify-content: flex-start;
  grid-auto-flow: column;
  grid-gap: 5px;
  padding: 20px;
  padding-bottom: 0;
`;

function BackLink({ children, to }) {
  return (
    <StyledLink to={to}>
      <ArrowBackIos />
      <span>{children}</span>
    </StyledLink>
  );
}

export default BackLink;
