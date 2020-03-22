import React, { useEffect, useState } from "react";
import styled from "styled-components";

import { useAudio } from "../../audioContext";
import { getMMSSFromMs } from "./utils";

const LeftTime = styled.span`
  text-align: right;
`;

const Wrapper = styled.div`
  align-items: center;
  color: ${p => p.theme.color[p.isDisabled ? "disabled" : "primary"]};
  display: grid;
  grid-template-columns: 80px 1fr 80px;
  grid-gap: 5px;
`;

function Position() {
  const audio = useAudio();
  const [position, setPosition] = useState(0);
  const [seekPosition, setSeekPosition] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    audio.subscribeToProgress(setPosition);
    // eslint-disable-next-line
  }, [audio.subscribeToProgress]);

  // if (!audio.track) return null;

  function handleSeek(e) {
    if (isSeeking) {
      setSeekPosition(e.target.value);
    } else {
      const nextPosition = parseInt(seekPosition);
      if (!isNaN(nextPosition)) {
        audio.onSeek(nextPosition);
        setPosition(nextPosition);
      }
    }
  }

  const displayPos = isSeeking ? seekPosition : position;

  return (
    <Wrapper isDisabled={!audio.track}>
      <LeftTime>{getMMSSFromMs(displayPos)}</LeftTime>
      <input
        type="range"
        disabled={!audio.track}
        min={0}
        max={audio.duration}
        onChange={handleSeek}
        onMouseDown={e => {
          setIsSeeking(true);
        }}
        onMouseUp={e => {
          setIsSeeking(false);
        }}
        value={displayPos}
      />
      <span>{getMMSSFromMs(audio.duration)}</span>
    </Wrapper>
  );
}

export default Position;
