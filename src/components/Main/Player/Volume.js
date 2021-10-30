import React from "react";
import styled from "styled-components";
import VolumeMute from "@material-ui/icons/VolumeMute";
import VolumeUp from "@material-ui/icons/VolumeUp";

import { useAudio } from "../../../hooks";

const Icon = styled.div`
  cursor: pointer;

  :hover {
    color: ${(p) => p.theme.color.highlight};
  }
`;

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
  const { isMuted, onMute, onUnmute, onVolumeChange, volume } = useAudio();

  const IconName = volume === 0 || isMuted ? VolumeMute : VolumeUp;

  return (
    <Wrapper>
      <Icon
        as={IconName}
        fontSize="small"
        onClick={isMuted ? onUnmute : onMute}
      />
      <Input
        max={1}
        min={0}
        onChange={(e) => onVolumeChange(e.currentTarget.value)}
        step={0.01}
        type="range"
        value={isMuted ? 0 : volume}
      />
    </Wrapper>
  );
}

export default Volume;
