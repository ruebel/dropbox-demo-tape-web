import React, { useEffect, useState } from "react";
import styled from "styled-components";

const Image = styled.img``;

const Name = styled.span`
  font-size: 16px;
`;

const Wrapper = styled.div`
  align-items: center;
  background-color: ${(p) => p.theme.color.primary};
  border-radius: 50%;
  color: ${(p) => p.theme.color.background};
  display: flex;
  justify-content: center;
  height: ${(p) => p.size}px;
  overflow: hidden;
  position: relative;
  width: ${(p) => p.size}px;
`;

function Avatar({ initials, name, size = 36, url }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (url && hasError) {
      setHasError(false);
    }
    // eslint-disable-next-line
  }, [url]);

  return (
    <Wrapper size={size}>
      {url && !hasError ? (
        <Image
          alt={name || initials}
          height={size}
          onError={() => setHasError(true)}
          src={url}
          width={size}
        />
      ) : (
        <Name>{initials}</Name>
      )}
    </Wrapper>
  );
}

export default Avatar;
