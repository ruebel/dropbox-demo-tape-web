import { useAudio } from "@/hooks/useAudio";
import { audioPostionAtom, durationAtom, seekToAtom } from "@/state/audio";
import { getMMSSFromMs } from "@/utils/time";
import { useAtom, useAtomValue } from "jotai";
import { useState } from "react";

import styles from "./position.module.css";

export function Position() {
  const { track } = useAudio();
  const duration = useAtomValue(durationAtom);
  const position = useAtomValue(audioPostionAtom);
  const [seekTo, setSeekTo] = useAtom(seekToAtom);
  const [seekPosition, setSeekPosition] = useState(-1);
  const [prevSeekTo, setPrevSeekTo] = useState(seekTo);

  // Clear the local drag value once a seek finishes
  if (seekTo !== prevSeekTo) {
    setPrevSeekTo(seekTo);
    if (seekTo === -1 && seekPosition > -1) {
      setSeekPosition(-1);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSeekPosition(e.target.valueAsNumber);
  }

  function handleSeek() {
    setSeekTo(seekPosition);
  }

  const displayPos =
    seekPosition > -1 ? seekPosition : seekTo > -1 ? seekTo : position || 0;

  return (
    <div className={styles.position}>
      <span className={styles.leftTime}>{getMMSSFromMs(displayPos)}</span>
      <input
        type="range"
        disabled={!track}
        min={0}
        max={duration}
        onChange={handleChange}
        onMouseDown={() => {
          setSeekPosition(position);
        }}
        onMouseUp={handleSeek}
        onTouchEnd={handleSeek}
        onTouchStart={() => {
          setSeekPosition(position);
        }}
        value={displayPos}
      />
      <span>{getMMSSFromMs(duration)}</span>
    </div>
  );
}
