import React, { useEffect, useState } from "react";
import { useDropbox } from "./dropboxContext";
import useLocalStorage from "./useLocalStorage";

const imgState = {
  none: "none",
  fetched: "fetched",
  error: "error",
};

function PlaylistImage({ playlist, size = 50 }) {
  const [url, setUrl] = useState();
  const [imageState, setImageState] = useState(imgState.none);
  const { dbx } = useDropbox();
  const [imageMap = {}, setImageMap] = useLocalStorage("playlistImages");
  const imageId = playlist?.data?.image?.id;

  useEffect(() => {
    if (url && imageState !== imgState.error) return;

    async function getImageUrl() {
      if (playlist?.data?.image) {
        const fileLink = await dbx.filesGetTemporaryLink({
          path: playlist.data.image?.path_lower,
        });
        setUrl(fileLink?.result?.link);
        setImageMap({
          ...imageMap,
          [playlist?.data?.image?.id]: fileLink?.link,
        });
        setImageState(imgState.fetched);
      }
    }

    const mappedImage = imageMap[imageId];

    if (imageState !== imgState.error && mappedImage) {
      setUrl(mappedImage);
    } else {
      getImageUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId, imageState]);

  function handleError(er) {
    if (url && imgState !== imgState.fetched) {
      // we didn't fetch the image and there's an error
      // so force the fetch again
      setImageState(imgState.error);
    }
  }

  return (
    <img
      alt={playlist?.data?.title}
      height={size}
      onError={handleError}
      src={url || `${process.env.PUBLIC_URL}/android-icon-96x96.png`}
      width={size}
    />
  );
}

export default PlaylistImage;
