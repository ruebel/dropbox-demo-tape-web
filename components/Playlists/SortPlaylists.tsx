import { IconButton } from "@/components/IconButton/IconButton";
import { SortIcon } from "@/components/icons/SortIcon";
import { PlaylistSortType } from "@/utils/types";
import { useState } from "react";

import { sortPlaylistsAtom } from "@/state/playlists";
import { useAtom } from "jotai";
import styles from "./playlists.module.css";

const sortOptions: PlaylistSortType[] = ["artist", "title", "modified"];

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function SortPlaylists() {
  const [showMenu, setShowMenu] = useState(false);
  const [value, onChange] = useAtom(sortPlaylistsAtom);

  return (
    <div>
      <IconButton
        ariaLabel="Sort Playlists"
        onClick={() => setShowMenu((val) => !val)}
        size={40}
      >
        <SortIcon size={24} />
      </IconButton>
      {showMenu && (
        <ul
          aria-label="Playlist sort options"
          className={styles.options}
          role="listbox"
        >
          {sortOptions.map((option) => (
            <li
              aria-selected={value === option}
              className={styles.option}
              key={option}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(option);
                setShowMenu(false);
              }}
              role="option"
              tabIndex={-1}
            >
              {capitalize(option)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
