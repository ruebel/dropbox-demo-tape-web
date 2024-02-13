import { Dropbox } from "dropbox";

export async function getCurrentUser(dbx: Dropbox) {
  const res = await dbx.usersGetCurrentAccount();
  const user = res?.result;
  return user;
}

export async function getUsers(dbx: Dropbox, userIds: string[]) {
  // Get user info of all unknown users
  const results = await dbx.usersGetAccountBatch({
    account_ids: userIds,
  });

  return results.result;
}
