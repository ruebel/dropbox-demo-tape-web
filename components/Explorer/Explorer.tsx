import { useFiles } from "@/hooks/useFiles";
import { EnhancedFileMeta, SortDir } from "@/utils/types";
import { useState } from "react";

import { BreadcrumbTrail } from "@/components/Explorer/BreadcrumbTrail";
import { Entry } from "@/components/Explorer/Entry";
import { SortableHeader } from "@/components/Explorer/SortableHeader";
import { List } from "@/components/List/List";
import { Progress } from "@/components/Progress/Progress";
import styles from "./explorer.module.css";

type ExplorerProps = {
  initialFolder?: string;
  onPathChange?: (path: string) => void;
  onSelectionChange?: (entries: EnhancedFileMeta[]) => void;
  // Lists audio files that cannot be selected, to show what a folder holds
  previewFiles?: boolean;
  selectedEntries?: EnhancedFileMeta[];
  singleSelection?: boolean;
  showFiles?: boolean;
  showImages?: boolean;
};

export function Explorer({
  initialFolder = "",
  onPathChange,
  onSelectionChange,
  previewFiles = false,
  selectedEntries = [],
  singleSelection = false,
  showFiles = false,
  showImages = false,
}: ExplorerProps) {
  const [folder, setFolder] = useState(initialFolder);
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState<SortDir | null>(null);
  const { files, isLoading } = useFiles({
    folder,
    // If we cannot get a folder or a path is invalid
    // then send the user back to their home folder
    onError: () => {
      if (folder.length > 0) changeFolder("");
    },
    showFiles: showFiles || previewFiles,
    showImages,
    sortBy,
    sortDir,
  });

  // Every way of opening a folder goes through here, so onPathChange always
  // has the folder that is shown
  function changeFolder(path: string) {
    setFolder(path);
    onPathChange?.(path);
  }

  function handleClick(entry: EnhancedFileMeta) {
    if (entry.type === "folder") {
      changeFolder(entry.path);
    } else if (showFiles || showImages) {
      if (singleSelection) {
        if (selectedEntries.some((e) => e.id === entry.id)) {
          onSelectionChange?.([]);
        } else {
          onSelectionChange?.([entry]);
        }
      } else {
        if (selectedEntries.some((e) => e.id === entry.id)) {
          onSelectionChange?.(selectedEntries.filter((e) => e.id !== entry.id));
        } else {
          onSelectionChange?.([...selectedEntries, entry]);
        }
      }
    }
  }

  function handleSort(column: string) {
    if (column !== sortBy) {
      setSortBy(column);
      setSortDir("desc");
    } else {
      if (sortDir === "desc") {
        setSortDir("asc");
      } else {
        setSortDir(null);
        setSortBy("");
      }
    }
  }
  return (
    <div className={styles.wrapper}>
      <BreadcrumbTrail onClick={changeFolder} path={folder} />
      <div className={styles.header}>
        <span />
        <SortableHeader
          onClick={() => handleSort("name")}
          sortDir={sortBy === "name" ? sortDir : null}
        >
          Name
        </SortableHeader>
        <SortableHeader
          hideOnSmall={true}
          onClick={() => handleSort("modified")}
          sortDir={sortBy === "modified" ? sortDir : null}
        >
          Modified
        </SortableHeader>
        <SortableHeader
          hideOnSmall={true}
          onClick={() => handleSort("modifiedBy")}
          sortDir={sortBy === "modifiedBy" ? sortDir : null}
        >
          Modified By
        </SortableHeader>
      </div>
      {isLoading && <Progress />}
      {files.length === 0 && !isLoading && (
        <div className={styles.empty}>No files</div>
      )}
      <List
        isLoading={isLoading}
        items={files}
        itemRenderer={(entry) => (
          <Entry
            entry={entry}
            isDisabled={previewFiles && entry.type !== "folder"}
            isSelected={selectedEntries.some(
              (e) => e.path_lower === entry.path_lower
            )}
            onClick={handleClick}
          />
        )}
      />
    </div>
  );
}
