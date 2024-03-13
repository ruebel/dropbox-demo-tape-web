import { CloseIcon } from "@/components/icons/CloseIcon";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import styles from "./search.module.css";

type SearchProps = {
  onChange: (val: string) => void;
  value: string;
};

export function Search({ onChange, value }: SearchProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus the search input when the user presses Cmd+F or Ctrl+F
  useHotkeys("mod+f, meta+f", (e) => {
    e.preventDefault();
    e.stopPropagation();
    searchRef.current?.focus();
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.icon}>
        <SearchIcon size={24} />
      </div>
      <input
        className={styles.input}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Clear the search if the user presses the Escape key
          if (e.key === "Escape" && value.length > 0) {
            onChange("");
          }
        }}
        placeholder="Search"
        ref={searchRef}
        type="text"
        value={value}
      />
      {value.length > 0 && (
        <button className={styles.clear} onClick={() => onChange("")}>
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}
