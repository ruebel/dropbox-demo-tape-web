import { PlaylistTrack } from "@/utils/types";

import { IconButton } from "@/components/IconButton/IconButton";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { removeExtension } from "@/utils/file";
import styles from "./editableTrackList.module.css";

type EditableTrackProps = {
  // The folder the track's file is in, shown under the title
  folder?: string;
  index: number;
  // Shows a button to remove the track when set
  onDelete?: (id: string) => void;
  track: PlaylistTrack;
};

export function EditableTrack({
  folder,
  index,
  onDelete,
  track,
}: EditableTrackProps) {
  return (
    <div className={styles.track}>
      <span className={styles.number}>{index}</span>
      <span className={styles.title}>
        <span className={styles.trackName}>{removeExtension(track.name)}</span>
        {folder && (
          <span className={styles.folder}>
            {/* Keeps the path left to right inside the right-to-left box */}
            <span dir="ltr">{folder}</span>
          </span>
        )}
      </span>
      {onDelete && (
        <IconButton ariaLabel="Remove track" onClick={() => onDelete(track.id)}>
          <DeleteIcon size={20} />
        </IconButton>
      )}
    </div>
  );
}
