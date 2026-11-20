"use client";

import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { TextInput } from "@/components/TextInput/TextInput";
import { DEMO_FILE_EXT, HOME } from "@/utils/constants";
import { useState } from "react";

import { uploadFile } from "@/api/file";
import { getFolder } from "@/api/folder";
import { Explorer } from "@/components/Explorer/Explorer";
import { Typeahead } from "@/components/Typeahead/Typeahead";
import { dbxAtom } from "@/state/dropbox";
import { artistsAtom, playlistsAtom } from "@/state/playlists";
import { styleArray } from "@/utils/style";
import { Playlist, PlaylistData } from "@/utils/types";
import { playlistUrl } from "@/utils/url";
import { useAtom, useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import styles from "./addPlaylist.module.css";

type PlaylistType = "tracks" | "folder";

const PLAYLIST_TYPES: { help: string; label: string; value: PlaylistType }[] = [
  {
    help: "Pick the tracks yourself, from anywhere in your Dropbox.",
    label: "Pick tracks",
    value: "tracks",
  },
  {
    help: "Open a folder below. Every audio file in it is in the playlist, and new files appear automatically.",
    label: "Sync a folder",
    value: "folder",
  },
];

function getFolderName(path: string) {
  return path.split("/").pop() ?? "";
}

export function AddPlaylist() {
  const [type, setType] = useState<PlaylistType>("tracks");
  const [artist, setArtist] = useState("");
  const [typedTitle, setTypedTitle] = useState("");
  const [path, setPath] = useState("/");
  const dbx = useAtomValue(dbxAtom);
  const [playlists, savePlaylistLocally] = useAtom(playlistsAtom);
  const artists = useAtomValue(artistsAtom);
  const { push } = useRouter();

  const isFolder = type === "folder";
  const isRoot = path === "" || path === "/";
  // A folder playlist is named after its folder until the user types a title
  const title = isFolder && !typedTitle ? getFolderName(path) : typedTitle;
  const canSave = !isFolder || !isRoot;
  const help = PLAYLIST_TYPES.find((t) => t.value === type)?.help;

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (!title || !artist || !path || !canSave) return;

    const filePath = `${path}/${title}.${DEMO_FILE_EXT}`;
    const playlistData: PlaylistData = { artist, title, tracks: [] };

    if (isFolder) {
      const folder = await getFolder(dbx, path);
      // The tape page fills in the tracks with its first sync
      playlistData.folder = { ...folder, sort: "name" };
    }

    // Save the file to dropbox
    const meta = await uploadFile(dbx, playlistData, filePath);

    // Create entire playlist shape
    const playlist = { data: playlistData, meta } as Playlist;

    // save playlist locally
    savePlaylistLocally([...playlists, playlist]);

    // Redirect the user to the playlist page
    push(playlistUrl(meta.id));

    return false;
  }

  return (
    <form className={styles.wrapper} onSubmit={handleSave}>
      <div className={styles.header}>
        <h2>New Playlist</h2>
        <ButtonLink disabled={!canSave} type="submit">
          Save
        </ButtonLink>
        <ButtonLink href={HOME}>Cancel</ButtonLink>
      </div>
      <fieldset className={styles.typeSwitch}>
        <legend className={styles.visuallyHidden}>Playlist type</legend>
        <div className={styles.typeOptions}>
          {PLAYLIST_TYPES.map((option) => (
            <label
              className={styleArray([
                styles.typeOption,
                option.value === type && styles.typeSelected,
              ])}
              key={option.value}
            >
              <input
                checked={option.value === type}
                className={styles.typeRadio}
                name="type"
                onChange={() => setType(option.value)}
                type="radio"
                value={option.value}
              />
              {option.label}
            </label>
          ))}
        </div>
        <p className={styles.typeHelp}>{help}</p>
      </fieldset>
      <TextInput
        onChange={setTypedTitle}
        isRequired={true}
        title="Title"
        value={title}
      />
      <Typeahead
        isRequired={true}
        onChange={setArtist}
        options={artists}
        title="Artist"
        value={artist}
      />
      <div className={styles.explorerWrapper}>
        <div className={styles.explorerInner}>
          {/* Lists the audio files too, so a folder of tracks does not look
              empty */}
          <Explorer onPathChange={setPath} previewFiles={true} />
        </div>
        <div className={styles.explorerTitle}>
          {isFolder ? "Folder" : "Location"}
        </div>
      </div>
    </form>
  );
}
