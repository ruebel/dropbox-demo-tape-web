import { useAudio } from "@/hooks/useAudio";
import { audioPostionAtom, durationAtom, seekToAtom } from "@/state/audio";
import { getMMSSFromMs } from "@/utils/time";
import { useAtom, useAtomValue } from "jotai";
import { useRef, useState } from "react";

import styles from "./position.module.css";

export function Position() {
  const { track } = useAudio();
  const duration = useAtomValue(durationAtom);
  const position = useAtomValue(audioPostionAtom);
  const [seekTo, setSeekTo] = useAtom(seekToAtom);
  const [seekPosition, setSeekPosition] = useState(-1);
  const [prevSeekTo, setPrevSeekTo] = useState(seekTo);
  const isDraggingRef = useRef(false);

  // Clear the local drag value once a seek finishes
  if (seekTo !== prevSeekTo) {
    setPrevSeekTo(seekTo);
    if (seekTo === -1 && seekPosition > -1) {
      setSeekPosition(-1);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isDraggingRef.current) {
      setSeekPosition(e.target.valueAsNumber);
    } else {
      // Keyboard and screen reader changes have no release event, so seek now
      setSeekTo(e.target.valueAsNumber);
    }
  }

  function handlePointerDown() {
    isDraggingRef.current = true;
    setSeekPosition(position);
  }

  function handlePointerUp() {
    isDraggingRef.current = false;
    setSeekTo(seekPosition);
  }

  // The browser took over the gesture (for example, to scroll), so drop the drag
  function handlePointerCancel() {
    isDraggingRef.current = false;
    setSeekPosition(-1);
  }

  const displayPos =
    seekPosition > -1 ? seekPosition : seekTo > -1 ? seekTo : position || 0;

  return (
    <div className={styles.position}>
      <span className={styles.leftTime}>{getMMSSFromMs(displayPos)}</span>
      <input
        type="range"
        aria-valuetext={getMMSSFromMs(displayPos)}
        disabled={!track}
        min={0}
        max={duration}
        step={1000}
        onChange={handleChange}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        value={displayPos}
      />
      <span>{getMMSSFromMs(duration)}</span>
    </div>
  );
}
