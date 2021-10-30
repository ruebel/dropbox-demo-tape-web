import { useState } from "react";

import { useCache } from "./cacheContext";
import { useDropbox } from "./dropboxContext";
import { logError } from "./useErrorTracking";

export function useUsers() {
  const cache = useCache();
  const { dbx, isAuthenticated } = useDropbox();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState(cache.getValue("users") || {});

  async function fetchUsers(userIds) {
    // Filter users down to users we don't already have info on
    const usersToFetch = userIds.filter((userId) => !users[userId]);

    if (usersToFetch.length > 0 && dbx && isAuthenticated) {
      setIsLoading(true);

      try {
        // Get user info of all unknown users
        const results = await dbx.usersGetAccountBatch({
          /* eslint-disable camelcase */
          account_ids: usersToFetch,
        });

        // Update dictionary
        const updatedUsers = (results?.result || results).reduce(
          (acc, user) => ({
            ...acc,
            [user.account_id]: user,
          }),
          users
        );

        // Save in cache and in state
        saveUsers(updatedUsers);
        setIsLoading(false);

        return updatedUsers;
      } catch (exception) {
        logError(exception);
        console.error(exception);
      }
    }

    return users;
  }

  function saveUsers(updatedUsers) {
    // Save in state and to cache
    setUsers(updatedUsers);
    cache.setValue("users", updatedUsers);
  }

  return {
    data: users,
    isLoading,
    fetchUsers,
  };
}
