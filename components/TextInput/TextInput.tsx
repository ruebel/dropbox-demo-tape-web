import { styleArray } from "@/utils/style";
import { useId } from "react";
import styles from "./textInput.module.css";

type TextInputProps = {
  error?: string;
  hasError?: boolean;
  isRequired?: boolean;
  onChange: (val: string) => void;
  title: string;
  value: string;
};

export function TextInput({
  error,
  hasError = false,
  isRequired = false,
  onChange,
  title,
  value,
}: TextInputProps) {
  const errorId = useId();

  return (
    <div>
      <label
        aria-required={isRequired}
        className={styleArray([styles.wrapper, hasError && styles.hasError])}
      >
        <input
          // The error is outside the label, so the field's name stays the
          // title and the error is read as its description
          aria-describedby={error ? errorId : undefined}
          aria-invalid={hasError || undefined}
          className={styles.input}
          required={isRequired}
          onChange={(e) => onChange(e.target.value)}
          type="text"
          value={value}
        />
        <div className={styles.title}>{title}</div>
      </label>
      {error && (
        <div className={styles.errorMessage} id={errorId} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
