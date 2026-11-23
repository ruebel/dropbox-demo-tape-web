import { EnhancedFileMeta } from "@/utils/types";

import { AudioIcon } from "@/components/icons/AudioIcon";
import { CheckboxIcon } from "@/components/icons/CheckboxIcon";
import { FolderIcon } from "@/components/icons/FolderIcon";
import { ImageIcon } from "@/components/icons/ImageIcon";
import { usersAtom } from "@/state/users";
import { isImage } from "@/utils/file";
import { styleArray } from "@/utils/style";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { useAtomValue } from "jotai";
import styles from "./explorer.module.css";

type EntryProps = {
  entry: EnhancedFileMeta;
  // Shown for information only, so it cannot be clicked
  isDisabled?: boolean;
  isSelected?: boolean;
  onClick: (entry: EnhancedFileMeta) => void;
  // A data URL of the image, for an image file. Without it, an image file
  // shows an image icon.
  thumbnail?: string;
};

export function Entry({
  entry,
  isDisabled = false,
  isSelected = false,
  onClick,
  thumbnail,
}: EntryProps) {
  const users = useAtomValue(usersAtom);
  const user = entry.modifiedBy && users ? users[entry.modifiedBy] : null;

  const Icon = isSelected
    ? CheckboxIcon
    : entry.isFolder
    ? FolderIcon
    : AudioIcon;

  return (
    <button
      className={styleArray([styles.entry, isSelected && styles.entrySelected])}
      disabled={isDisabled}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick(entry);
      }}
    >
      <div className={styles.entryInner}>
        {entry.type === "file" && isImage(entry.name) ? (
          <Thumbnail isSelected={isSelected} url={thumbnail} />
        ) : (
          <Icon size={25} />
        )}
        <span className={styles.entryName}>{entry.name}</span>
        {entry.type === "file" && (
          <span className={styleArray([styles.entrySub, styles.hideOnSmall])}>
            {formatDistanceToNow(new Date(entry.server_modified))} ago
          </span>
        )}
        {entry.type === "file" && (
          <span className={styles.hideOnSmall}>{user?.name?.display_name}</span>
        )}
      </div>
    </button>
  );
}

type ThumbnailProps = {
  isSelected: boolean;
  url?: string;
};

// Keeps showing the image when it is selected, with a check badge on it, so
// the user can see which image they picked
function Thumbnail({ isSelected, url }: ThumbnailProps) {
  return (
    <span className={styles.thumbnail}>
      {url ? (
        // The file name is next to it, so the image needs no alt text
        <img alt="" className={styles.thumbnailImage} src={url} />
      ) : (
        <ImageIcon size={25} />
      )}
      {isSelected && (
        <span className={styles.thumbnailBadge}>
          <CheckboxIcon size={16} />
        </span>
      )}
    </span>
  );
}
