"use client";

import { SongDetails } from "@/components/AudioControls/SongDetails";
import { useAudio } from "@/hooks/useAudio";

import styles from "./audioControls.module.css";
import { IconButton } from "@/components/IconButton/IconButton";
import { PreviousIcon } from "@/components/icons/PreviousIcon";
import { PlayIcon } from "@/components/icons/PlayIcon";
import { PauseIcon } from "@/components/icons/PauseIcon";
import { NextIcon } from "@/components/icons/NextIcon";
import { Volume } from "@/components/AudioControls/Volume";
import { Position } from "@/components/AudioControls/Position";
import { styleArray } from "@/utils/style";

export function AudioControls() {
  const {
    audioState,
    hasPrevious,
    hasNext,
    onPrevious,
    onNext,
    onPause,
    onResume,
    playlist,
    track,
  } = useAudio();

  const playButton =
    audioState === "playing" ? (
      <IconButton ariaLabel="Pause" onClick={onPause} size={40}>
        <PauseIcon size={26} />
      </IconButton>
    ) : (
      <IconButton
        ariaLabel="Play"
        disabled={audioState === "loading" || !track}
        hideBorder={true}
        onClick={onResume}
        size={40}
      >
        <PlayIcon size={26} />
      </IconButton>
    );

  return (
    <div
      className={styleArray([
        styles.audioControls,
        audioState !== "stopped" && styles.audioControlsPlaying,
      ])}
    >
      <div className={styles.showOnSmall}>{playButton}</div>
      <SongDetails playlist={playlist} track={track} />
      <div className={styleArray([styles.controls, styles.hideOnSmall])}>
        <div className={styles.controlsInner}>
          <div className={styles.buttons}>
            <IconButton
              ariaLabel="Previous"
              disabled={!hasPrevious}
              hideBorder={true}
              onClick={onPrevious}
            >
              <PreviousIcon size={20} />
            </IconButton>
            {playButton}
            <IconButton
              ariaLabel="Next"
              disabled={!hasNext}
              hideBorder={true}
              onClick={onNext}
            >
              <NextIcon size={20} />
            </IconButton>
          </div>
          <Position />
        </div>
      </div>
      <div className={styles.hideOnSmall}>
        <Volume />
      </div>
    </div>
  );
}
