import { PlaylistImage } from "@/components/PlaylistImage/PlaylistImage";
import { Playlist } from "@/utils/types";

import styles from "./playlistHeader.module.css";

type PlaylistHeaderProps = {
  playlist: Playlist;
};

export function PlaylistHeader({ playlist }: PlaylistHeaderProps) {
  return (
    <div className={styles.wrapper}>
      <PlaylistImage playlist={playlist} />
      <div className={styles.info}>
        <div className={styles.title}>{playlist.data.title}</div>
        {playlist.data.artist && (
          <div className={styles.artist}>
            By <span className={styles.artistName}>{playlist.data.artist}</span>
          </div>
        )}
      </div>
    </div>
  );
}
