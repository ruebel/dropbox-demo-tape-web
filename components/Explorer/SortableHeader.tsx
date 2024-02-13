import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import { ChevronUpIcon } from "@/components/icons/ChevronUpIcon";
import { SortDir } from "@/utils/types";

import { styleArray } from "@/utils/style";
import styles from "./explorer.module.css";

type SortableHeaderProps = {
  hideOnSmall?: boolean;
  onClick: () => void;
  sortDir: SortDir | null;
} & React.PropsWithChildren;

export function SortableHeader({
  children,
  hideOnSmall = false,
  onClick,
  sortDir,
}: SortableHeaderProps) {
  const Icon =
    sortDir === "asc"
      ? ChevronUpIcon
      : sortDir === "desc"
      ? ChevronDownIcon
      : null;

  return (
    <button
      className={styleArray([
        styles.sortableHeader,
        hideOnSmall && styles.hideOnSmall,
      ])}
      onClick={onClick}
    >
      <span>{children}</span>
      {Icon && <Icon size={30} />}
    </button>
  );
}
