import { PlaylistTrack } from "@/utils/types";

import { IconButton } from "@/components/IconButton/IconButton";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { removeExtension } from "@/utils/file";
import styles from "./editableTrackList.module.css";

type EditableTrackProps = {
  index: number;
  // Shows a button to remove the track when set
  onDelete?: (id: string) => void;
  track: PlaylistTrack;
};

export function EditableTrack({ index, onDelete, track }: EditableTrackProps) {
  return (
    <div className={styles.track}>
      {/* Stays when empty, so the numbers line up in the same column */}
      <div className={styles.play}>
        {onDelete && (
          <IconButton
            ariaLabel="Remove track"
            onClick={() => onDelete(track.id)}
          >
            <DeleteIcon size={20} />
          </IconButton>
        )}
      </div>
      <span>{index}.</span>
      <span className={styles.trackName}>{removeExtension(track.name)}</span>
    </div>
  );
}
