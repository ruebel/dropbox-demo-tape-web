import Link from "next/link";
import { PropsWithChildren } from "react";

import styles from "./buttonLink.module.css";

type ButtonLinkProps = {
  disabled?: boolean;
  href?: string;
  onBlur?: () => void;
  onClick?: () => void;
  type?: "button" | "submit";
} & PropsWithChildren;

export function ButtonLink({
  children,
  disabled,
  href,
  onBlur,
  onClick,
  type = "button",
}: ButtonLinkProps) {
  return href ? (
    <Link
      className={styles.buttonLink}
      href={href}
      onBlur={onBlur}
      onClick={onClick}
    >
      {children}
    </Link>
  ) : (
    <button
      className={styles.buttonLink}
      disabled={disabled}
      onBlur={onBlur}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}
