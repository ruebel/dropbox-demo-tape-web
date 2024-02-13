import { forwardRef, useState, useEffect } from "react";

import styles from "./avatar.module.css";
import Image from "next/image";

type AvatarProps = {
  initials?: string;
  name: string | undefined | null;
  size: number;
  url: string | null | undefined;
};

export function Avatar({ initials, name, size, url }: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (url && hasError) {
      setHasError(false);
    }
  }, [hasError, url]);

  return (
    <div className={styles.avatar}>
      {url && !hasError ? (
        <Image
          alt={name || initials || "avatar"}
          height={size}
          onError={() => setHasError(true)}
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
