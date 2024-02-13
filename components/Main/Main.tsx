"use client";

import styles from "./main.module.css";
import { useAtomValue } from "jotai";
import { isAuthenticatedAtom } from "@/state/dropbox";
import { Playlists } from "@/components/Playlists/Playlists";
import { Progress } from "@/components/Progress/Progress";

export function Main() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  if (!isAuthenticated) {
    return (
      <div className={styles.auth}>
        <Progress />
      </div>
    );
  }

  return (
    <div className={styles.main}>
      <div className={styles.inner}>
        <Playlists />
      </div>
    </div>
  );
}
