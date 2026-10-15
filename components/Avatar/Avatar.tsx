import { forwardRef, useState } from "react";

import styles from "./avatar.module.css";
import Image from "next/image";

type AvatarProps = {
  initials?: string;
  name: string | undefined | null;
  size: number;
  url: string | null | undefined;
};

export function Avatar({ initials, name, size, url }: AvatarProps) {
  // Track the URL that failed so a new URL gets a fresh load attempt
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const hasError = !!url && url === failedUrl;

  return (
    <div className={styles.avatar}>
      {url && !hasError ? (
        <Image
          alt={name || initials || "avatar"}
          height={size}
          onError={() => setFailedUrl(url)}
          src={url}
          style={{ height: size, width: size }}
          width={size}
        />
      ) : (
        <div>{initials}</div>
      )}
    </div>
  );
}
