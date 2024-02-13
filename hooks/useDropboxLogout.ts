import { isAuthenticatedAtom, rootStorageAtom } from "@/state/dropbox";
import { currentUserAtom } from "@/state/users";
import { useSetAtom } from "jotai";

export function useDropboxLogout() {
  const setIsAuthenticated = useSetAtom(isAuthenticatedAtom);
  const setCurrentUser = useSetAtom(currentUserAtom);
  const setRootStorage = useSetAtom(rootStorageAtom);

  return () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setRootStorage({});
  };
}
