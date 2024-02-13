import { Playlist, PlaylistTrack } from "@/utils/types";
import styles from "./audioControls.module.css";
import { PlaylistImage } from "@/components/PlaylistImage/PlaylistImage";
import { removeExtension } from "@/utils/file";
import { useSetAtom } from "jotai";
import { showFullDetailsAtom } from "@/state/audio";

type SongDetailsProps = {
  playlist: Playlist | null;
  track: PlaylistTrack | undefined;
};

export function SongDetails({ playlist, track }: SongDetailsProps) {
  const setShowFullDetails = useSetAtom(showFullDetailsAtom);

  return (
    <div className={styles.sd} onClick={() => setShowFullDetails(true)}>
      <PlaylistImage playlist={playlist} />
      <div className={styles.sd_info}>
        <div className={styles.sd_trackName}>
          {removeExtension(track?.name)}
        </div>
        <p className={styles.sd_artist}>
          {playlist?.data?.artist || playlist?.data?.title}
        </p>
      </div>
    </div>
  );
}
