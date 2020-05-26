import React from "react";
import styled from "styled-components";

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);

    function handleReaderLoad(event) {
      const width = 100;
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        const height = (width * img.width) / img.height;
        // eslint-disable-next-line no-console
        console.log(img.width, img.height);

        const elem = document.createElement("canvas");
        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext("2d");

        ctx.drawImage(img, 0, 0, width, height);
        ctx.canvas.toBlob(
          blob => {
            resolve(blob);
            // resolve(new File([blob], fileName, {
            //   type: "image/jpeg",
            //   lastModified: Date.now()
            // });
          },
          "image/jpeg",
          1
        );
      };
    }

    reader.onerror = error => {
      console.log(error);
      reject(error);
    };
    reader.onload = handleReaderLoad;
  });
}

function ImageInput() {
  async function handleChange(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const file = files[0];
    const blob = await resizeImage(file);
    // eslint-disable-next-line no-console
    console.log(blob, file);
  }

  return (
    <div>
      <input type="file" id="albumImage" onChange={handleChange} />
    </div>
  );
}

export default ImageInput;
