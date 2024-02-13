import { EnhancedFileMeta } from "@/utils/types";

import { AudioIcon } from "@/components/icons/AudioIcon";
import { CheckboxIcon } from "@/components/icons/CheckboxIcon";
import { FolderIcon } from "@/components/icons/FolderIcon";
import { usersAtom } from "@/state/users";
import { styleArray } from "@/utils/style";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { useAtomValue } from "jotai";
import styles from "./explorer.module.css";

type EntryProps = {
  entry: EnhancedFileMeta;
  isSelected?: boolean;
  onClick: (entry: EnhancedFileMeta) => void;
};

export function Entry({ entry, onClick, isSelected = false }: EntryProps) {
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
      onClick={() => onClick(entry)}
    >
      <div className={styles.entryInner}>
        <Icon size={25} />
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
