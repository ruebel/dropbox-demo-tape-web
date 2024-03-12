"use client";

import { showFullDetailsAtom } from "@/state/audio";
import { useAtom, useAtomValue } from "jotai";

import { Position } from "@/components/AudioControls/Position";
import { IconButton } from "@/components/IconButton/IconButton";
import { PlaylistImage } from "@/components/PlaylistImage/PlaylistImage";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import { NextIcon } from "@/components/icons/NextIcon";
import { PauseIcon } from "@/components/icons/PauseIcon";
import { PlayIcon } from "@/components/icons/PlayIcon";
import { PreviousIcon } from "@/components/icons/PreviousIcon";
import { useAudio } from "@/hooks/useAudio";
import { isAuthenticatedAtom } from "@/state/dropbox";
import { removeExtension } from "@/utils/file";
import styles from "./fullAudioDetails.module.css";

export function FullAudioDetails() {
  const [showFullDetails, setShowFullDetails] = useAtom(showFullDetailsAtom);
  const {
    audioState,
    hasNext,
    hasPrevious,
    onNext,
    onPause,
    onPrevious,
    onResume,
    playlist,
    track,
  } = useAudio();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  if (!showFullDetails || !isAuthenticated) return null;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.playlistName}>{playlist?.data?.title}</div>
        <IconButton
          ariaLabel="expand"
          hideBorder={true}
          onClick={() => setShowFullDetails(false)}
        >
          <ChevronDownIcon size={30} />
        </IconButton>
      </div>
      <PlaylistImage playlist={playlist} size="100%" />
      <div className={styles.info}>
        <div className={styles.trackName}>{removeExtension(track?.name)}</div>
        <div className={styles.artist}>{playlist?.data?.artist}</div>
      </div>
      <Position />
      <div className={styles.buttons}>
        <IconButton
          ariaLabel="Previous"
          disabled={!hasPrevious}
          hideBorder={true}
          onClick={onPrevious}
          size={40}
        >
          <PreviousIcon size={25} />
        </IconButton>
        {audioState === "playing" ? (
          <IconButton ariaLabel="Pause" onClick={onPause} size={50}>
            <PauseIcon size={30} />
          </IconButton>
        ) : (
          <IconButton
            ariaLabel="Play"
            disabled={audioState === "loading" || !track}
            onClick={onResume}
            size={50}
          >
            <PlayIcon size={30} />
          </IconButton>
        )}
        <IconButton
          ariaLabel="Next"
          disabled={!hasNext}
          hideBorder={true}
          onClick={onNext}
          size={40}
        >
          <NextIcon size={25} />
        </IconButton>
      </div>
    </div>
  );
}
