import React, { useEffect, useState } from "react";

import Button from "./Button";

function ConfirmationButton({ message, onClick, ...props }) {
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
    <Button onBlur={() => setIsConfirming(false)} onClick={onClick}>
      {message || "Are you sure?"}
    </Button>
  ) : (
    <Button onClick={onConfirm} {...props} />
  );
}

export default ConfirmationButton;
