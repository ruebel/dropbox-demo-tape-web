"use client";

import { Explorer } from "@/components/Explorer/Explorer";
import { PlaylistHeader } from "@/components/PlaylistHeader/PlaylistHeader";
import { playlistAtom } from "@/state/playlists";
import { EnhancedFileMeta, Playlist } from "@/utils/types";
import { useAtom } from "jotai";
import { useState } from "react";

import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { playlistUrl } from "@/utils/url";
import { useRouter } from "next/navigation";
import styles from "./imageExplorer.module.css";

type ImageExplorerProps = {
  id: string;
};

export function ImageExplorer({ id }: ImageExplorerProps) {
  const [playlist, savePlaylist] = useAtom(playlistAtom(id));
  const [selectedImage, setSelectedImage] = useState<
    EnhancedFileMeta | undefined
  >(playlist?.data?.image);
  const [isDirty, setIsDirty] = useState(false);
  const { push } = useRouter();

  function handleSelectionChange([image]: EnhancedFileMeta[]) {
    setSelectedImage(image);
    if (!isDirty) {
      setIsDirty(true);
    }
  }

  async function handleSave() {
    if (!playlist) return;

    await savePlaylist({
      ...playlist,
      data: {
        ...playlist.data,
        image: selectedImage,
      },
    } as Playlist);

    push(playlistUrl(id));
  }

  if (!playlist) return null;

  return (
    <div>
      <div className={styles.header}>
        <PlaylistHeader playlist={playlist} />
        <div className={styles.actions}>
          <ButtonLink disabled={!isDirty} onClick={handleSave}>
            Save
          </ButtonLink>
          <ButtonLink href={playlistUrl(id)}>Cancel</ButtonLink>
        </div>
      </div>
      <Explorer
        onSelectionChange={handleSelectionChange}
        selectedEntries={selectedImage ? [selectedImage] : []}
        showImages={true}
      />
    </div>
  );
}
