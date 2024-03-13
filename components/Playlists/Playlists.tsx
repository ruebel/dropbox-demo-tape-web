import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { loadableDBPlaylists, playlistsAtom } from "@/state/playlists";
import { formatRelative } from "date-fns/formatRelative";
import { useAtomValue } from "jotai";

import { List } from "@/components/List/List";
import { PlaylistImage } from "@/components/PlaylistImage/PlaylistImage";
import { Progress } from "@/components/Progress/Progress";
import { Search } from "@/components/Search/Search";
import { usersAtom } from "@/state/users";
import { playlistUrl } from "@/utils/url";
import Link from "next/link";
import { useState } from "react";
import styles from "./playlists.module.css";

export function Playlists() {
  const rawPlaylists = useAtomValue(playlistsAtom);
  const dbLoading = useAtomValue(loadableDBPlaylists);
  const users = useAtomValue(usersAtom);
  const [query, setQuery] = useState("");

  const showLoading = dbLoading.state === "loading";

  const playlists =
    rawPlaylists.length > 0 && query.length > 0
      ? rawPlaylists.filter((playlist) => {
          return (
            playlist.data.artist?.toLowerCase().includes(query.toLowerCase()) ||
            playlist.data.title?.toLowerCase().includes(query.toLowerCase())
          );
        })
      : rawPlaylists;

  const showEmpty = !showLoading && rawPlaylists.length === 0;
  const showEmptySearch =
    !showEmpty && query.length > 0 && playlists.length === 0;

  return (
    <div className={styles.root}>
      {showLoading && <Progress />}
      {showEmpty ? (
        <div className={styles.empty}>
          <h2>No playlists found</h2>
          <ButtonLink href="/playlist/new">Add your first playlist</ButtonLink>
        </div>
      ) : (
        <div className={styles.actions}>
          <Search onChange={setQuery} value={query} />
          <ButtonLink href="/playlist/new">Add</ButtonLink>
        </div>
      )}
      {showEmptySearch && (
        <div className={styles.emptySearch}>
          No playlists found matching &quot;{query}&quot;
        </div>
      )}
      <List
        getKey={(playlist) => playlist.meta.id}
        items={playlists}
        itemRenderer={(playlist) => {
          const user = users?.[playlist.meta.modifiedBy];

          return (
            <div className={styles.playlistWrapper}>
              <Link href={playlistUrl(playlist.meta.id)}>
                <div className={styles.playlist}>
                  <PlaylistImage playlist={playlist} size={50} />
                  <div className={styles.title}>
                    <h3>{playlist.data.title}</h3>
                    <span className={styles.path}>
                      {playlist.data.artist || playlist.meta.path_display}
                    </span>
                  </div>
                  <div className={styles.updated}>
                    <div>
                      Updated{" "}
                      {formatRelative(
                        new Date(playlist.meta.server_modified),
                        new Date()
                      )}
                    </div>
                    {user && (
                      <div className={styles.modified}>
                        by {user.name.display_name}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          );
        }}
      />
    </div>
  );
}
