import { ErrorIcon } from "@/components/icons/ErrorIcon";
import { Tooltip } from "@/components/Tooltip/Tooltip";
import { logError } from "@/hooks/useErrorTracking";
import { dbxAtom, isAuthenticatedAtom } from "@/state/dropbox";
import { imageMapAtom } from "@/state/image";
import { Playlist } from "@/utils/types";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useId, useState } from "react";
import styles from "./playlistImage.module.css";

const FALLBACK_IMAGE = "/android-icon-96x96.png";
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

export function PlaylistImage({ playlist, size = 50 }: PlaylistImageProps) {
  const [url, setUrl] = useState("");
  const [failedUrl, setFailedUrl] = useState("");
  // The image whose link request failed, so the badge resets when the
  // playlist changes
  const [failedImageId, setFailedImageId] = useState("");
  const [imageState, setImageState] = useState<ImageState>("none");
  const dbx = useAtomValue(dbxAtom);
  const imageId = playlist?.data?.image?.id;
  const [imageMap, setImageMap] = useAtom(imageMapAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  const mappedImage = imageId ? imageMap[imageId] : undefined;
  const imageUrl = imageState !== "error" && mappedImage ? mappedImage : url;
  const showFallback = !imageUrl || imageUrl === failedUrl;
  // The playlist has an image, but it could not be shown
  const hasError =
    !!imageId &&
    showFallback &&
    ((!!failedUrl && imageUrl === failedUrl) || failedImageId === imageId);

  useEffect(() => {
    async function getImageUrl() {
      if (playlist?.data?.image?.path_lower) {
        try {
          const fileLink = await dbx.filesGetTemporaryLink({
            path: playlist.data.image.path_lower,
          });

          setUrl(fileLink?.result?.link);
          setFailedImageId("");

          setImageMap({
            ...imageMap,
            [playlist?.data?.image?.id]: fileLink?.result?.link,
          });
          setImageState("fetched");
        } catch (error) {
          // The Dropbox client has no token until sign-in finishes,
          // so only log failures after sign-in
          if (isAuthenticated) {
            logError(error as Error);
            setFailedImageId(playlist.data.image.id);
          }
          setUrl("");
        }
      } else {
        setUrl("");
        setImageState("error");
      }
    }

    if (imageState === "error" || !mappedImage) {
      getImageUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId, imageState, playlist?.meta?.id, isAuthenticated]);

  function handleError() {
    if (showFallback) {
      return;
    }
    if (imageUrl === url) {
      // A freshly fetched link failed, so stop retrying and show the fallback
      setFailedUrl(url);
    } else {
      // A cached link failed (likely expired), so fetch a fresh one
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
        aria-describedby={hasError ? errorId : undefined}
        className={styles.image}
        height={size === "100%" ? "auto" : size}
        onError={handleError}
        src={showFallback ? FALLBACK_IMAGE : imageUrl}
        width={size}
      />
      {hasError && (
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
