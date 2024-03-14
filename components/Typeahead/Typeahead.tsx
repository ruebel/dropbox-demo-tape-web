import { useRef, useState } from "react";

import { styleArray } from "@/utils/style";
import styles from "./typeahead.module.css";

type TypeaheadProps = {
  isRequired?: boolean;
  onChange: (newValue: string) => void;
  options: string[];
  title: string;
  value: string;
};

export function Typeahead({
  isRequired = false,
  onChange,
  options,
  title,
  value,
}: TypeaheadProps) {
  const [showOptions, setShowOptions] = useState(false);
  const ref = useRef<HTMLLabelElement>(null);
  const optionsRef = useRef<HTMLUListElement>(null);

  const position = ref.current?.getBoundingClientRect();
  const filteredOptions =
    value && showOptions
      ? options.filter((option) =>
          option.toLowerCase().includes(value.toLowerCase())
        )
      : options;

  return (
    <label
      aria-required={isRequired}
      className={styleArray([styles.wrapper])}
      onBlur={(e) => {
        // Only hide the options if the blur event is not caused by
        // on of our menu items
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setShowOptions(false);
        }
      }}
      onFocus={() => setShowOptions(true)}
      ref={ref}
    >
      <input
        className={styles.input}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") {
            setShowOptions(false);
          } else if (e.key === "ArrowDown") {
            const firstOption = optionsRef.current?.firstChild;
            if (firstOption) (firstOption as HTMLElement).focus();
          }
        }}
        required={isRequired}
        type="text"
        value={value}
      />
      <div className={styles.title}>{title}</div>
      {showOptions && position && (
        <ul
          aria-label="Options"
          className={styles.options}
          ref={optionsRef}
          role="listbox"
          style={{
            left: 0,
            top: position.height,
            width: position.width,
          }}
        >
          {filteredOptions.map((option, i) => (
            <li
              aria-selected={value === option}
              aria-posinset={i + 1}
              aria-setsize={filteredOptions.length}
              className={styles.option}
              key={option}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onChange(option);
                  setShowOptions(false);
                  ref.current?.focus();
                  e.stopPropagation();
                  e.preventDefault();
                } else if (e.key === "ArrowDown") {
                  const elem = optionsRef.current?.children[i + 1];
                  if (elem) (elem as HTMLElement).focus();
                  e.stopPropagation();
                } else if (e.key === "ArrowUp") {
                  const elem = optionsRef.current?.children[i - 1];
                  if (elem) (elem as HTMLElement).focus();
                  e.stopPropagation();
                } else if (e.key === "Escape") {
                  // Focus the input
                  ref.current?.focus();
                  e.stopPropagation();
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                onChange(option);
                setShowOptions(false);
              }}
              role="option"
              tabIndex={-1}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}
