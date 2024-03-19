import { PlaylistTrack } from "@/utils/types";

import { ErrorIcon } from "@/components/icons/ErrorIcon";
import { HeadsetIcon } from "@/components/icons/HeadsetIcon";
import { PauseIcon } from "@/components/icons/PauseIcon";
import { PlayIcon } from "@/components/icons/PlayIcon";
import { audioStateAtom, playingTrackIdAtom } from "@/state/audio";
import { userByIdAtom } from "@/state/users";
import { getModifiedBy, removeExtension } from "@/utils/file";
import { styleArray } from "@/utils/style";
import { getMMSSFromMs } from "@/utils/time";
import { formatRelative } from "date-fns/formatRelative";
import { useAtomValue } from "jotai";
import styles from "./track.module.css";

type TrackProps = {
  index: number;
  onClick: (id: string) => void;
  track: PlaylistTrack;
};

export function Track({ index, onClick, track }: TrackProps) {
  const user = useAtomValue(userByIdAtom(getModifiedBy(track)));
  const playingTrackId = useAtomValue(playingTrackIdAtom);
  const isPlaying = playingTrackId === track.id;
  const audioState = useAtomValue(audioStateAtom);

  return (
    <button
      className={styleArray([
        styles.track,
        isPlaying && styles.trackPlaying,
        !!track.error && styles.trackError,
      ])}
      onClick={() => onClick(track.id)}
    >
      <div className={styles.play}>
        {track.error ? (
          <ErrorIcon size={20} />
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
      <span className={styles.trackName}>{removeExtension(track.name)}</span>
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
