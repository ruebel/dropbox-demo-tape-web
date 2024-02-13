"use client";

import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { useDropboxAuth } from "@/hooks/useDropboxAuth";
import { isAuthenticatedAtom } from "@/state/dropbox";
import { useAtomValue } from "jotai";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { DropboxLogo } from "@/components/icons/DropboxLogo";
import { HOME } from "@/utils/constants";
import styles from "./auth.module.css";

export function Auth() {
  const { onAuth, parseAcessToken } = useDropboxAuth();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated && code) {
      parseAcessToken(code, window.location.origin);
    } else if (isAuthenticated) {
      redirect(searchParams.get("redirect") || HOME);
    }
  }, [code, isAuthenticated, parseAcessToken]);

  async function handleAuth() {
    const href = await onAuth(window.location.origin);

    if (href) {
      router.push(href as string);
    }
  }

  return (
    <div className={styles.root}>
      <h2>Log in</h2>
      <p>To get started we need to connect to your Dropbox account</p>
      <ButtonLink onClick={handleAuth}>
        <div className={styles.authButton}>
          <DropboxLogo />
          <span>Connect Dropbox</span>
        </div>
      </ButtonLink>
    </div>
  );
}
