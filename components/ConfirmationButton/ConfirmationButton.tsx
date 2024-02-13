import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { useState, useEffect } from "react";

type ConfirmationButtonProps = {
  message?: string;
  onClick: () => void;
};

export function ConfirmationButton({
  children,
  message,
  onClick,
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
    <ButtonLink onBlur={() => setIsConfirming(false)} onClick={onClick}>
      {message || "Are you sure?"}
    </ButtonLink>
  ) : (
    <ButtonLink onClick={onConfirm}>{children}</ButtonLink>
  );
}
