import { ErrorIcon } from "@/components/icons/ErrorIcon";
import { Tooltip } from "@/components/Tooltip/Tooltip";
import { logError } from "@/hooks/useErrorTracking";
import { dbxAtom, isAuthenticatedAtom } from "@/state/dropbox";
import {
  brokenImageIdsAtom,
  freshImageLinksAtom,
  imageMapAtom,
} from "@/state/image";
import { Playlist } from "@/utils/types";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useId, useState } from "react";
import styles from "./playlistImage.module.css";

const FALLBACK_IMAGE = "/playlist-fallback.svg";
const IMAGE_ERROR = "Couldn't load the playlist image";

type PlaylistImageProps = {
  playlist: Playlist | null;
  size?: number | string;
};

type ImageState = "none" | "fetched" | "error";

// The badge is about 30% of the image, but stays readable and not too big
function getBadgeSize(size: number | string) {
  return typeof size === "number"
    ? Math.min(32, Math.max(16, Math.round(size * 0.3)))
    : 32;
}

// Returns a copy of `set` with `value` added
function addTo(set: ReadonlySet<string>, value: string) {
  return new Set(set).add(value);
}

export function PlaylistImage({ playlist, size = 50 }: PlaylistImageProps) {
  const [url, setUrl] = useState("");
  const [imageState, setImageState] = useState<ImageState>("none");
  const dbx = useAtomValue(dbxAtom);
  const imageId = playlist?.data?.image?.id;
  const [imageMap, setImageMap] = useAtom(imageMapAtom);
  // Shared with every other PlaylistImage, so copies of the same image (the
  // playlist header and the player bar) agree on which links are fresh and
  // which images are broken, and do not keep fetching new links
  const [freshLinks, setFreshLinks] = useAtom(freshImageLinksAtom);
  const [brokenImageIds, setBrokenImageIds] = useAtom(brokenImageIdsAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  const mappedImage = imageId ? imageMap[imageId] : undefined;
  const imageUrl = imageState !== "error" && mappedImage ? mappedImage : url;
  // The playlist has an image, but it could not be shown
  const isBroken = !!imageId && brokenImageIds.has(imageId);
  const showFallback = isBroken || !imageUrl;

  useEffect(() => {
    async function getImageUrl() {
      const image = playlist?.data?.image;

      if (image?.path_lower) {
        try {
          const fileLink = await dbx.filesGetTemporaryLink({
            path: image.path_lower,
          });
          const link = fileLink.result.link;

          setFreshLinks((links) => addTo(links, link));
          setUrl(link);
          // Updates from the latest map, because other images save theirs too
          setImageMap((map) => ({ ...map, [image.id]: link }));
          setImageState("fetched");
        } catch (error) {
          // The Dropbox client has no token until sign-in finishes,
          // so only log and give up after sign-in
          if (isAuthenticated) {
            logError(error as Error);
            setBrokenImageIds((ids) => addTo(ids, image.id));
          }
          setUrl("");
        }
      } else {
        setUrl("");
        setImageState("error");
      }
    }

    if (!isBroken && (imageState === "error" || !mappedImage)) {
      getImageUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId, imageState, isBroken, playlist?.meta?.id, isAuthenticated]);

  function handleError() {
    // The fallback icon itself failed, so there is nothing left to try
    if (showFallback || !imageId) {
      return;
    }
    if (freshLinks.has(imageUrl)) {
      // A link fetched this session failed, so the image itself is broken.
      // Stop fetching links for it here and in every other copy.
      setBrokenImageIds((ids) => addTo(ids, imageId));
    } else {
      // A link from an earlier session failed (likely expired), so fetch
      // a fresh one
      setImageState("error");
    }
  }

  const badgeSize = getBadgeSize(size);
  const errorId = useId();

  return (
    <span
      className={styles.root}
      style={size === "100%" ? { width: "100%" } : undefined}
    >
      <img
        alt={playlist?.data?.title}
        aria-describedby={isBroken ? errorId : undefined}
        className={styles.image}
        height={size === "100%" ? "auto" : size}
        onError={handleError}
        src={showFallback ? FALLBACK_IMAGE : imageUrl}
        width={size}
      />
      {isBroken && (
        <>
          <span
            className={styles.errorBadge}
            style={{ height: badgeSize, width: badgeSize }}
          >
            <ErrorIcon size={badgeSize} />
          </span>
          <Tooltip id={errorId}>{IMAGE_ERROR}</Tooltip>
        </>
      )}
    </span>
  );
}
