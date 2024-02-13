import { styleArray } from "@/utils/style";
import styles from "./iconButton.module.css";

type IconButtonProps = {
  ariaLabel: string;
  disabled?: boolean;
  hideBackground?: boolean;
  hideBorder?: boolean;
  isSimple?: boolean;
  onClick: () => void;
  size?: number;
};

export function IconButton({
  ariaLabel,
  children,
  disabled = false,
  hideBackground = false,
  hideBorder = false,
  isSimple = false,
  onClick,
  size = 30,
}: IconButtonProps & React.PropsWithChildren) {
  return (
    <button
      aria-label={ariaLabel}
      className={styleArray([
        styles.iconButton,
        hideBackground && styles.iconButtonHideBackground,
        hideBorder && styles.iconButtonHideBorder,
        isSimple && styles.iconButtonSimple,
      ])}
      disabled={disabled}
      onClick={onClick}
      style={{ height: size, width: size }}
    >
      {children}
    </button>
  );
}
