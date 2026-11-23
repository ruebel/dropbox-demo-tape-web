import { PlaylistTrack } from "@/utils/types";

import { ErrorIcon } from "@/components/icons/ErrorIcon";
import { HeadsetIcon } from "@/components/icons/HeadsetIcon";
import { PauseIcon } from "@/components/icons/PauseIcon";
import { PlayIcon } from "@/components/icons/PlayIcon";
import { Tooltip } from "@/components/Tooltip/Tooltip";
import {
  audioStateAtom,
  playingTrackIdAtom,
  sessionTrackErrorsAtom,
} from "@/state/audio";
import { userByIdAtom } from "@/state/users";
import { getModifiedBy, removeExtension } from "@/utils/file";
import { styleArray } from "@/utils/style";
import { getMMSSFromMs } from "@/utils/time";
import { formatRelative } from "date-fns/formatRelative";
import { useAtomValue } from "jotai";
import { useId } from "react";
import styles from "./track.module.css";

type TrackProps = {
  // The folder the track's file is in, shown under the title
  folder?: string;
  index: number;
  onClick: (id: string) => void;
  // False when the error message is already shown next to the track
  showErrorTooltip?: boolean;
  track: PlaylistTrack;
};

export function Track({
  folder,
  index,
  onClick,
  showErrorTooltip = true,
  track,
}: TrackProps) {
  const user = useAtomValue(userByIdAtom(getModifiedBy(track)));
  const playingTrackId = useAtomValue(playingTrackIdAtom);
  const isPlaying = playingTrackId === track.id;
  const audioState = useAtomValue(audioStateAtom);
  const errorId = useId();
  // A saved error, or one from this session (such as a dropped connection)
  const sessionError = useAtomValue(sessionTrackErrorsAtom)[track.id];
  const error = track.error || sessionError;
  const hasErrorTooltip = !!error && showErrorTooltip;

  return (
    <button
      aria-describedby={hasErrorTooltip ? errorId : undefined}
      className={styleArray([
        styles.track,
        isPlaying && styles.trackPlaying,
        !!error && styles.trackError,
      ])}
      onClick={() => onClick(track.id)}
    >
      <div className={styles.play}>
        {error ? (
          <>
            <ErrorIcon size={20} />
            {hasErrorTooltip && <Tooltip id={errorId}>{error}</Tooltip>}
          </>
        ) : isPlaying ? (
          audioState === "playing" ? (
            <PauseIcon size={20} />
          ) : (
            <HeadsetIcon size={20} />
          )
        ) : (
          <PlayIcon size={24} />
        )}
      </div>
      <span>{index}.</span>
      <span className={styles.title}>
        <span className={styles.trackName}>{removeExtension(track.name)}</span>
        {folder && (
          <span className={styles.folder}>
            {/* Keeps the path left to right inside the right-to-left box */}
            <span dir="ltr">{folder}</span>
          </span>
        )}
      </span>
      <span className={styles.duration}>
        {track.duration ? getMMSSFromMs(track.duration * 1000) : "--:--"}
      </span>
      <span className={styles.updated}>
        <span>
          Updated {formatRelative(new Date(track.server_modified), new Date())}
        </span>
        {user && (
          <span className={styles.updatedBy}>by {user.name.display_name}</span>
        )}
      </span>
    </button>
  );
}
