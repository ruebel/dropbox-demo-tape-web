"use client";

import { CacheProvider } from "@/hooks/cacheContext";
import { DropboxProvider } from "@/hooks/dropboxContext";
import { PropsWithChildren } from "react";

export function Providers({ children }: PropsWithChildren) {
  return (
    <CacheProvider>
      <DropboxProvider authUrl={"/auth"}>{children}</DropboxProvider>
    </CacheProvider>
  );
}
