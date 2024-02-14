import { rootStorageAtom } from "@/state/dropbox";
import { dbPlaylistAtomEffect } from "@/state/playlists";
import { useAtom, useSetAtom } from "jotai";
import { useEffect } from "react";

export function useCacheSync() {
  useAtom(dbPlaylistAtomEffect);
  const setCache = useSetAtom(rootStorageAtom);

  // Initializes local cache if it doesn't exist yet
  useEffect(() => {
    const cache = localStorage.getItem("dt");

    if (!cache) {
      localStorage.setItem("dt", JSON.stringify({}));
      setCache({});
    }
  }, []);
}
