import { PlaylistImage } from "@/components/PlaylistImage/PlaylistImage";
import { Playlist } from "@/utils/types";

import { getMMSSFromMs } from "@/utils/time";
import styles from "./playlistHeader.module.css";

type PlaylistHeaderProps = {
  playlist: Playlist;
};

export function PlaylistHeader({ playlist }: PlaylistHeaderProps) {
  const duration = playlist.data.tracks.reduce(
    (acc, track) => acc + (track.duration || 0),
    0
  );

  return (
    <div className={styles.wrapper}>
      <PlaylistImage playlist={playlist} />
      <div className={styles.info}>
        <div className={styles.title}>{playlist.data.title}</div>
        {playlist.data.artist && (
          <div>
            <span className={styles.artistName}>{playlist.data.artist}</span>
            <span className={styles.duration}>
              {playlist.data.artist && <span> • </span>}
              {playlist.data.tracks.length} track
              {playlist.data.tracks.length !== 1 && "s"}
              {duration > 0 && ` • ${getMMSSFromMs(duration * 1000)}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
