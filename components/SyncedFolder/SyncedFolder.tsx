import { FolderIcon } from "@/components/icons/FolderIcon";
import { Tooltip } from "@/components/Tooltip/Tooltip";
import { getSyncedWithLabel } from "@/utils/playlist";
import { PlaylistFolder } from "@/utils/types";
import { PropsWithChildren, useId } from "react";
import styles from "./syncedFolder.module.css";

type SyncedFolderProps = PropsWithChildren<{
  folder: PlaylistFolder;
}>;

/**
 * Marks text about a folder playlist with a folder icon. Hovering the icon or
 * the text shows which folder the playlist syncs with.
 */
export function SyncedFolder({ children, folder }: SyncedFolderProps) {
  const tooltipId = useId();

  return (
    <span className={styles.root}>
      <span
        aria-describedby={tooltipId}
        aria-label="Folder playlist"
        className={styles.icon}
        role="img"
      >
        <FolderIcon size={14} />
      </span>
      {children}
      <Tooltip id={tooltipId}>{getSyncedWithLabel(folder)}</Tooltip>
    </span>
  );
}
