import styled from "styled-components";
import { Link } from "@reach/router";

export default styled(Link)`
  color: ${p => p.theme.color.primary};
  cursor: pointer;
  text-decoration: none;

  &:hover {
    color: ${p => p.theme.color.highlight};
  }
`;
