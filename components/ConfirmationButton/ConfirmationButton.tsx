import { ButtonLink, ButtonSize } from "@/components/ButtonLink/ButtonLink";
import { useState, useEffect } from "react";

type ConfirmationButtonProps = {
  message?: string;
  onClick: () => void;
  size?: ButtonSize;
};

export function ConfirmationButton({
  children,
  message,
  onClick,
  size,
}: ConfirmationButtonProps & React.PropsWithChildren) {
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsConfirming(false);
    }, 2000);
    return () => {
      clearTimeout(timeout);
    };
  }, [isConfirming]);

  function onConfirm() {
    setIsConfirming(true);
  }

  return isConfirming ? (
    <ButtonLink
      onBlur={() => setIsConfirming(false)}
      onClick={onClick}
      size={size}
    >
      {message || "Are you sure?"}
    </ButtonLink>
  ) : (
    <ButtonLink onClick={onConfirm} size={size}>
      {children}
    </ButtonLink>
  );
}
