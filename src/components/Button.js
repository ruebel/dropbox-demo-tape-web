import styled from "styled-components";

export default styled.button`
  background-color: ${p => p.theme.color.background};
  border-radius: 10px;
  border: 1px solid ${p => p.theme.color.white};
  color: ${p => p.theme.color.white};
  cursor: pointer;
  display: flex;
  font-size: 14px;
  justify-content: center;
  outline: none;
  padding: 10px 20px;
  text-transform: uppercase;

  transition: ${p => p.theme.transition};

  :hover,
  :focus {
    background-color: ${p => p.theme.color.white};
    color: ${p => p.theme.color.background};
  }

  ${p =>
    p.disabled
      ? `
    color: ${p.theme.color.disabled};
    cursor: unset;
    border-color: ${p.theme.color.disabled};

    :hover, :focus {
      background-color: ${p.theme.color.background};
      color: ${p.theme.color.disabled};
    }
  `
      : ""}
`;
