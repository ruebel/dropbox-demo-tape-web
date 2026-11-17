import Link from "next/link";
import { styleArray } from "@/utils/style";
import { PropsWithChildren } from "react";

import styles from "./buttonLink.module.css";

export type ButtonSize = "default" | "small";

type ButtonLinkProps = {
  disabled?: boolean;
  href?: string;
  onBlur?: () => void;
  onClick?: () => void;
  size?: ButtonSize;
  type?: "button" | "submit";
} & PropsWithChildren;

export function ButtonLink({
  children,
  disabled,
  href,
  onBlur,
  onClick,
  size = "default",
  type = "button",
}: ButtonLinkProps) {
  const className = styleArray([
    styles.buttonLink,
    size === "small" && styles.small,
  ]);

  return href ? (
    <Link
      className={className}
      href={href}
      onBlur={onBlur}
      onClick={onClick}
    >
      {children}
    </Link>
  ) : (
    <button
      className={className}
      disabled={disabled}
      onBlur={onBlur}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}
