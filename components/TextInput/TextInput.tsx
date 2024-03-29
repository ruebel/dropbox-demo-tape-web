import { styleArray } from "@/utils/style";
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
  return (
    <label
      aria-required={isRequired}
      className={styleArray([styles.wrapper, hasError && styles.hasError])}
    >
      <input
        className={styles.input}
        required={isRequired}
        onChange={(e) => onChange(e.target.value)}
        type="text"
        value={value}
      />
      <div className={styles.title}>{title}</div>
      {error && <div className={styles.errorMessage}>{error}</div>}
    </label>
  );
}
