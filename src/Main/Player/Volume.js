import React from "react";
import styled from "styled-components";
import VolumeUp from "@material-ui/icons/VolumeUp";

import { useAudio } from "../../audioContext";

const Input = styled.input`
  width: 100%;
`;

const Wrapper = styled.div`
  align-items: center;
  display: grid;
  grid-gap: 10px;
  grid-template-columns: 20px 1fr;
  padding: 0 10px;
`;

function Volume() {
  const { onVolumeChange, volume } = useAudio();

  return (
    <Wrapper>
      <VolumeUp fontSize="small" />
      <Input
        max={1}
        min={0}
        onChange={e => onVolumeChange(e.currentTarget.value)}
        step={0.01}
        type="range"
        value={volume}
      />
    </Wrapper>
  );
}

export default Volume;
