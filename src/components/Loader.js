import React from "react";
import LinearProgress from "@material-ui/core/LinearProgress";
import styled from "styled-components";

import Spacer from "./Spacer";

const Wrapper = styled.div`
  margin-bottom: -4px;
`;

function Loader({ isLoading }) {
  return (
    <Wrapper>
      {isLoading ? <LinearProgress /> : <Spacer height="4px" />}
    </Wrapper>
  );
}

export default Loader;
