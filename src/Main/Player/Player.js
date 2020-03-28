import React from "react";
import styled from "styled-components";

import Pause from "@material-ui/icons/Pause";
import PlayArrow from "@material-ui/icons/PlayArrow";
import SkipNext from "@material-ui/icons/SkipNext";
import SkipPrevious from "@material-ui/icons/SkipPrevious";

import { audioStates, useAudio } from "../../audioContext";

import IconButton from "../../IconButton";
import Position from "./Position";
import SongDetails from "./SongDetails";
import Volume from "./Volume";

const Buttons = styled.div`
  align-items: center;
  display: grid;
  grid-auto-flow: column;
  grid-gap: 20px;
  justify-content: center;
`;

const Controls = styled.div`
  display: flex;
  justify-content: center;
`;

const ControlsInner = styled.div`
  display: grid;
  flex: 1;
  grid-gap: 5px;
  max-width: 700px;
`;

const Wrapper = styled.div`
  align-items: center;
  background-color: ${p => p.theme.color.backgroundLight};
  bottom: 0;
  display: grid;
  grid-template-columns: minmax(200px, 0.5fr) 1fr 150px;
  padding: 10px 20px;
  position: absolute;
  width: 100%;
`;

function Player() {
  const audio = useAudio();

  const hasTrack = !!audio.track;
  const isPlaying = audio.state === audioStates.playing;
  const isLoading = audio.state === audioStates.loading;

  return (
    <Wrapper>
      <SongDetails playlist={audio.playlist} track={audio.track} />
      <Controls>
        <ControlsInner>
          <Buttons>
            <IconButton
              aria-label="Previous"
              disabled={!audio.hasPrevious}
              hideBorder
              onClick={audio.onPrevious}
            >
              <SkipPrevious fontSize="small" />
            </IconButton>
            {isPlaying ? (
              <IconButton aria-label="Pause" onClick={audio.onPause} size={40}>
                <Pause />
              </IconButton>
            ) : (
              <IconButton
                aria-label="Play"
                disabled={isLoading || !hasTrack}
                onClick={() => audio.onResume()}
                size={40}
              >
                <PlayArrow />
              </IconButton>
            )}
            <IconButton
              aria-label="Next"
              disabled={!audio.hasNext}
              hideBorder
              onClick={audio.onNext}
            >
              <SkipNext fontSize="small" />
            </IconButton>
          </Buttons>
          <Position />
        </ControlsInner>
      </Controls>
      <Volume />
    </Wrapper>
  );
}

export default Player;
