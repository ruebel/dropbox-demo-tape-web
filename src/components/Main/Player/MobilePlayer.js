import * as React from "react";
import styled from "styled-components";

import ExpandMore from "@material-ui/icons/ExpandMore";
import Pause from "@material-ui/icons/Pause";
import PlayArrow from "@material-ui/icons/PlayArrow";
import SkipNext from "@material-ui/icons/SkipNext";
import SkipPrevious from "@material-ui/icons/SkipPrevious";

import { audioStates, useAudio } from "../../../hooks";
import { removeExtension } from "../../../utils";

import IconButton from "../../IconButton";
import PlaylistImage from "../../PlaylistImage";
import Position from "./Position";
import SongDetails from "./SongDetails";

const Artist = styled.div`
  ${(p) => p.theme.typography.sub}
  color: ${(p) => p.theme.color.disabled};
`;

const Buttons = styled.div`
  align-items: center;
  display: grid;
  grid-auto-flow: column;
  grid-gap: 20px;
  justify-content: center;
`;

const Collapsed = styled.div`
  align-items: center;
  border-top: ;
  display: grid;
  grid-gap: 10px;
  grid-template-columns: auto 1fr;
  padding: 10px;
`;

const Expanded = styled.div`
  align-items: center;
  display: grid;
  grid-gap: 20px;
  grid-template-columns: 1fr;
  padding: 20px;
`;

const Header = styled.div`
  align-items: center;
  display: grid;
  grid-template-columns: 1fr auto;
  margin-top: 60px;
`;

const InfoWrapper = styled.div`
  display: grid;
  grid-gap: 10px;
  text-align: center;
`;

const TrackName = styled.div`
  ${(p) => p.theme.typography.base}
  font-weight: 500;
`;

const Wrapper = styled.div`
  background-color: ${(p) =>
    p.isExpanded ? p.theme.color.background : p.theme.color.backgroundLight};
  bottom: 0;
  height: ${(p) => (p.isExpanded ? "100vh" : "auto")};
  position: absolute;
  width: 100%;
`;

function MobilePlayer() {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const audio = useAudio();

  const hasTrack = !!audio.track;
  const isPlaying = audio.state === audioStates.playing;
  const isLoading = audio.state === audioStates.loading;

  if (!hasTrack) return null;

  const iconSize = isExpanded ? 40 : 30;

  const playButton = isPlaying ? (
    <IconButton
      aria-label="Pause"
      hideBackground={!isExpanded}
      hideBorder={!isExpanded}
      onClick={audio.onPause}
      size={iconSize + 10}
    >
      <Pause />
    </IconButton>
  ) : (
    <IconButton
      aria-label="Play"
      disabled={isLoading || !hasTrack}
      hideBackground={!isExpanded}
      hideBorder={!isExpanded}
      onClick={() => audio.onResume()}
      size={iconSize + 10}
    >
      <PlayArrow fontSize={isExpanded ? "large" : "default"} />
    </IconButton>
  );

  const inner = isExpanded ? (
    <Expanded>
      <Header>
        <TrackName>{audio.playlist?.data?.data?.title}</TrackName>
        <IconButton
          aria-label="expand"
          hideBorder
          onClick={() => setIsExpanded(false)}
        >
          <ExpandMore fontSize={isExpanded ? "default" : "small"} />
        </IconButton>
      </Header>
      <PlaylistImage playlist={audio.playlist} size="100%" />
      <InfoWrapper>
        <TrackName>{removeExtension(audio.track?.name)}</TrackName>
        <Artist>{audio.playlist?.data?.artist}</Artist>
      </InfoWrapper>
      <Position />
      <Buttons>
        <IconButton
          aria-label="Previous"
          disabled={!audio.hasPrevious}
          hideBorder
          onClick={audio.onPrevious}
          size={iconSize}
        >
          <SkipPrevious fontSize="small" />
        </IconButton>
        {playButton}
        <IconButton
          aria-label="Next"
          disabled={!audio.hasNext}
          hideBorder
          onClick={audio.onNext}
          size={iconSize}
        >
          <SkipNext fontSize={isExpanded ? "default" : "small"} />
        </IconButton>
      </Buttons>
    </Expanded>
  ) : (
    <Collapsed>
      {playButton}
      <div onClick={() => setIsExpanded(true)}>
        <SongDetails playlist={audio.playlist} track={audio.track} />
      </div>
    </Collapsed>
  );

  return <Wrapper isExpanded={isExpanded}>{inner}</Wrapper>;
}

export default MobilePlayer;
