import { getUsers } from "@/api/user";
import { dbxAtom, rootStorageAtom } from "@/state/dropbox";
import { UserMap } from "@/utils/types";
import { users } from "dropbox";
import { atom } from "jotai";
import { atomFamily } from "jotai/utils";

export const currentUserAtom = atom<users.FullAccount | null>(null);

export const usersAtom = atom(
  (get) => get(rootStorageAtom)?.users,
  async (get, set, users: UserMap) => {
    const root = get(rootStorageAtom);
    set(rootStorageAtom, { ...root, users });
  }
);

export const getUnknownUsersAtom = atom(
  null,
  async (get, set, userIds: string[]) => {
    const currentUsers = get(usersAtom);

    const unknownUsers = userIds.filter((id) => !currentUsers?.[id]);

    if (unknownUsers.length === 0) {
      return;
    }

    const dbx = get(dbxAtom);
    const newUsers = await getUsers(dbx, unknownUsers);
    const newUserMap = newUsers.reduce((acc, user) => {
      acc[user.account_id] = user;
      return acc;
    }, currentUsers || {});

    set(usersAtom, newUserMap);
  }
);

export const userByIdAtom = atomFamily((id: string) =>
  atom((get) => get(usersAtom)?.[id])
);
