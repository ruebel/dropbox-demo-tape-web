import { useEffect, useState } from "react";

import { useDropbox } from "./dropboxContext";
import { useUsers } from "./useUsers";
import {
  getFiles,
  getModifiedBy,
  getModifiedUsersFromEntries,
  sortByTypeAndName,
  sortByTypeAndModified,
  sortByTypeAndModifiedBy,
} from "../utils";

export function useFiles({
  folder = "",
  showFiles = false,
  showImages = false,
  sortBy = "",
  sortDir = "",
}) {
  const { dbx } = useDropbox();
  const [folderFileMap, setFolderFileMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { fetchUsers } = useUsers();

  useEffect(() => {
    async function fetchFiles() {
      setIsLoading(true);
      const files = await getFiles(dbx, folder, showFiles, showImages);

      // Get all user ids of users who have modified listed files
      const userIds = getModifiedUsersFromEntries(files.data);
      const users = await fetchUsers(userIds);

      const filesWithUsers = {
        ...files,
        data: files.data.map((f) => ({
          ...f,
          user: users[getModifiedBy(f)],
        })),
      };

      setFolderFileMap({
        [folder]: filesWithUsers,
      });
      setIsLoading(false);
    }

    if (dbx) {
      fetchFiles();
    }
    // eslint-disable-next-line
  }, [dbx, folder]);

  const { cursor, data = [], hasMore } = folderFileMap[folder] || {};

  let sortedData = data;

  if (sortBy && sortDir) {
    if (sortBy === "name") {
      sortedData = data.sort(sortByTypeAndName(sortDir));
    } else if (sortBy === "modified") {
      sortedData = data.sort(sortByTypeAndModified(sortDir));
    } else if (sortBy === "modifiedBy") {
      sortedData = data.sort(sortByTypeAndModifiedBy(sortDir));
    }
  }

  return {
    cursor,
    files: sortedData,
    folder,
    hasMore,
    isLoading,
  };
}
