"use client";

import { Explorer } from "@/components/Explorer/Explorer";
import { PlaylistHeader } from "@/components/PlaylistHeader/PlaylistHeader";
import { playlistAtom, updatePlaylistAtom } from "@/state/playlists";
import { EnhancedFileMeta } from "@/utils/types";
import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";

import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { playlistUrl } from "@/utils/url";
import { useRouter } from "next/navigation";
import styles from "./imageExplorer.module.css";

type ImageExplorerProps = {
  id: string;
};

export function ImageExplorer({ id }: ImageExplorerProps) {
  const playlist = useAtomValue(playlistAtom(id));
  const updatePlaylist = useSetAtom(updatePlaylistAtom);
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

    // Applies only the image to the latest saved playlist, so changes the
    // player saved while the page was open are kept
    await updatePlaylist({
      playlistId: id,
      update: (latest) => ({
        ...latest,
        data: { ...latest.data, image: selectedImage },
      }),
    });

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
