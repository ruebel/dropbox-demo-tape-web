"use client";

import { useDropboxLogout } from "@/hooks/useDropboxLogout";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar/Avatar";
import { Menu } from "@/components/Menu/Menu";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { TapeIcon } from "@/components/icons/TapeIcon";
import { useCacheSync } from "@/hooks/useCacheSync";
import { useDropboxAuth } from "@/hooks/useDropboxAuth";
import { isAuthenticatedAtom, isStorageLoadingAtom } from "@/state/dropbox";
import { currentUserAtom } from "@/state/users";
import { HOME } from "@/utils/constants";
import Link from "next/link";
import { redirect, usePathname } from "next/navigation";
import styles from "./header.module.css";

export function Header() {
  const [menuPosition, setMenuPosition] = useState<DOMRect | null>(null);
  const onLogout = useDropboxLogout();
  const currentUser = useAtomValue(currentUserAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const path = usePathname();
  const { isPending } = useDropboxAuth();
  const isStorageLoading = useAtomValue(isStorageLoadingAtom);
  useCacheSync();

  // Redirect to auth page if not authenticated
  useEffect(() => {
    if (
      !isAuthenticated &&
      !isPending &&
      !isStorageLoading &&
      path !== "/auth"
    ) {
      redirect(`/auth?redirect=${path}`);
    }
  }, [path, isAuthenticated, isPending, isStorageLoading]);

  return (
    <nav className={styles.header}>
      <Link href={HOME}>
        <div className={styles.inner}>
          {path === "/" || path === "/auth" ? (
            <TapeIcon size={36} />
          ) : (
            <ArrowLeftIcon size={36} />
          )}
          <h1 className={styles.title}>Demo Tape</h1>
        </div>
      </Link>
      <span />
      <button
        className={styles.menuButton}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMenuPosition((value) => (value ? null : rect));
        }}
      >
        <Avatar
          initials={currentUser?.name.abbreviated_name}
          name={currentUser?.name.display_name}
          size={36}
          url={currentUser?.profile_photo_url}
        />
      </button>
      {menuPosition && (
        <Menu
          items={[
            {
              label: "Log out",
              onClick: onLogout,
            },
          ]}
          position={menuPosition}
        />
      )}
    </nav>
  );
}
