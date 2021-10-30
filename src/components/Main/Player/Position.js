import React, { useRef, useState } from "react";
import styled from "styled-components";

import { useAudio } from "../../../hooks";
import { getMMSSFromMs } from "./utils";

const LeftTime = styled.span`
  text-align: right;
`;

const Wrapper = styled.div`
  align-items: center;
  color: ${(p) => p.theme.color[p.isDisabled ? "disabled" : "primary"]};
  display: grid;
  grid-template-columns: 60px 1fr 60px;
  grid-gap: 5px;
`;

function Position() {
  const audio = useAudio();
  const [seekPosition, setSeekPosition] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const inputRef = useRef();

  function handleChange(e) {
    setSeekPosition(inputRef.current.value);
  }

  function handleSeek(e) {
    setIsSeeking(false);
    const nextPosition = parseInt(inputRef.current.value);
    if (!isNaN(nextPosition)) {
      audio.onSeek(nextPosition);
    }
  }

  const displayPos = isSeeking ? seekPosition : audio.position;

  return (
    <Wrapper isDisabled={!audio.track}>
      <LeftTime>{getMMSSFromMs(displayPos)}</LeftTime>
      <input
        type="range"
        disabled={!audio.track}
        min={0}
        max={audio.duration}
        onChange={handleChange}
        onMouseDown={(e) => {
          setIsSeeking(true);
        }}
        onMouseUp={(e) => {
          handleSeek(e);
        }}
        onTouchEnd={(e) => {
          handleSeek(e);
        }}
        onTouchStart={(e) => {
          setIsSeeking(true);
        }}
        ref={inputRef}
        value={displayPos}
      />
      <span>{getMMSSFromMs(audio.duration)}</span>
    </Wrapper>
  );
}

export default Position;
