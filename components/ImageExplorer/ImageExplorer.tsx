"use client";

import { Explorer } from "@/components/Explorer/Explorer";
import { PlaylistHeader } from "@/components/PlaylistHeader/PlaylistHeader";
import { updatePlaylistAtom } from "@/state/playlists";
import { EnhancedFileMeta, Playlist } from "@/utils/types";
import { useSetAtom } from "jotai";
import { useState } from "react";

import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { LoadedPlaylist } from "@/components/LoadedPlaylist/LoadedPlaylist";
import { playlistUrl } from "@/utils/url";
import { useRouter } from "next/navigation";
import styles from "./imageExplorer.module.css";

type ImageExplorerProps = {
  id: string;
};

export function ImageExplorer({ id }: ImageExplorerProps) {
  return (
    <LoadedPlaylist id={id}>
      {(playlist) => <ImagePicker id={id} playlist={playlist} />}
    </LoadedPlaylist>
  );
}

type ImagePickerProps = {
  id: string;
  // The latest playlist. The selection starts from its first value.
  playlist: Playlist;
};

function ImagePicker({ id, playlist }: ImagePickerProps) {
  const updatePlaylist = useSetAtom(updatePlaylistAtom);
  const [selectedImage, setSelectedImage] = useState<
    EnhancedFileMeta | undefined
  >(playlist.data.image);
  const [isDirty, setIsDirty] = useState(false);
  const { push } = useRouter();

  function handleSelectionChange([image]: EnhancedFileMeta[]) {
    setSelectedImage(image);
    if (!isDirty) {
      setIsDirty(true);
    }
  }

  async function handleSave() {
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
