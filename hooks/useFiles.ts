import { getFiles } from "@/api/file";
import { dbxAtom, isAuthenticatedAtom } from "@/state/dropbox";
import { getUnknownUsersAtom, usersAtom } from "@/state/users";
import {
  getModifiedUsersFromEntries,
  sortByTypeAndModified,
  sortByTypeAndModifiedBy,
  sortByTypeAndName,
} from "@/utils/file";
import { EnhancedFileMeta, SortDir } from "@/utils/types";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";

type UseFilesProps = {
  folder?: string | null;
  onError?: (error: Error) => void;
  showFiles?: boolean;
  showImages?: boolean;
  sortBy?: string | null;
  sortDir?: SortDir | null;
};

export function useFiles({
  folder = "",
  onError,
  showFiles = false,
  showImages = false,
  sortBy = "",
  sortDir = null,
}: UseFilesProps) {
  const dbx = useAtomValue(dbxAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const [folderFileMap, setFolderFileMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const fetchUsers = useSetAtom(getUnknownUsersAtom);
  const users = useAtomValue(usersAtom);

  useEffect(() => {
    async function fetchFiles() {
      setIsLoading(true);
      try {
        const files = await getFiles(dbx, folder || "", showFiles, showImages);

        // Get all user ids of users who have modified listed files
        const userIds = getModifiedUsersFromEntries(files.data);
        fetchUsers(userIds);

        setFolderFileMap({
          [folder || ""]: files,
        });
      } catch (err) {
        if (onError) {
          onError(err as Error);
        }
        setFolderFileMap({});
      } finally {
        setIsLoading(false);
      }
    }

    if (dbx && isAuthenticated) {
      fetchFiles();
    }
    // eslint-disable-next-line
  }, [dbx, folder, isAuthenticated]);

  const {
    cursor,
    data = [],
    hasMore,
  } = folderFileMap[(folder || "") as keyof typeof folderFileMap] || {};

  let sortedData = data;

  if (sortBy && sortDir) {
    if (sortBy === "name") {
      sortedData = data.sort(sortByTypeAndName(sortDir));
    } else if (sortBy === "modified") {
      sortedData = data.sort(sortByTypeAndModified(sortDir));
    } else if (sortBy === "modifiedBy") {
      sortedData = data.sort(sortByTypeAndModifiedBy(sortDir, users || {}));
    }
  }

  return {
    cursor,
    files: sortedData as EnhancedFileMeta[],
    folder,
    hasMore,
    isLoading,
  };
}
