import styled from "styled-components";

const size = 30;

export default styled.button`
  align-items: center;
  background-color: ${(p) => p.hideBackground ? "transparent" : p.theme.color.background};
  border: ${(p) => (p.hideBorder ? "none" : "1px solid white")};
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  height: ${(p) => p.size || size}px;
  justify-content: center;
  outline: none;
  transition: ${(p) => p.theme.transition};
  width: ${(p) => p.size || size}px;

  :hover,
  :focus {
    background-color: white;
    color: ${(p) => p.theme.color.background};
  }

  ${(p) =>
    p.disabled
      ? `
    color: ${p.theme.color.disabled};
    cursor: unset;
    border-color: ${p.theme.color.transparent};

    :hover, :focus {
      background-color: ${p.theme.color.background};
      color: ${p.theme.color.disabled};
    }
  `
      : ""}
`;
