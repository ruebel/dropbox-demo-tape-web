import { PropsWithChildren } from "react";
import styles from "./tooltip.module.css";

type TooltipProps = PropsWithChildren<{
  // Point the described element at this with aria-describedby
  id: string;
}>;

/**
 * A tooltip above its anchor, lined up with the anchor's left edge. The anchor
 * needs `position: relative`. Hidden until an ancestor sets
 * `--tooltip-display: block`, so the parent decides what shows it, for
 * example `.row:hover { --tooltip-display: block; }`.
 */
export function Tooltip({ children, id }: TooltipProps) {
  return (
    <span className={styles.tooltip} id={id} role="tooltip">
      {children}
    </span>
  );
}
