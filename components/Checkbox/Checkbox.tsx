import styles from "./checkbox.module.css";

type CheckboxProps = {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

/**
 * A checkbox with its label to the right
 */
export function Checkbox({
  checked,
  disabled = false,
  label,
  onChange,
}: CheckboxProps) {
  return (
    <label className={styles.wrapper}>
      <input
        checked={checked}
        className={styles.input}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}
