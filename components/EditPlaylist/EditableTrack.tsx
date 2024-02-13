import { PlaylistTrack } from "@/utils/types";

import { IconButton } from "@/components/IconButton/IconButton";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { removeExtension } from "@/utils/file";
import styles from "./editableTrackList.module.css";

type EditableTrackProps = {
  index: number;
  onDelete: (id: string) => void;
  track: PlaylistTrack;
};

export function EditableTrack({ index, onDelete, track }: EditableTrackProps) {
  return (
    <div className={styles.track}>
      <div className={styles.play}>
        <IconButton ariaLabel="Remove track" onClick={() => onDelete(track.id)}>
          <DeleteIcon size={20} />
        </IconButton>
      </div>
      <span>{index}.</span>
      <span className={styles.trackName}>{removeExtension(track.name)}</span>
    </div>
  );
}
