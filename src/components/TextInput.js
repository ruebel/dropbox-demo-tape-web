import React from "react";
import styled, { css } from "styled-components";

const errorStyle = css`
  border-color: ${p => p.theme.color.error};
  color: ${p => p.theme.color.error};
`;

const Error = styled.span`
  ${errorStyle}
  font-size: 14px;
  font-weight: 700;
`;

const StyledInput = styled.input`
  background-color: ${p => p.theme.color.background};
  border: 1px solid ${p => p.theme.color.primary};
  border-radius: 10px;
  color: inherit;
  font-size: 16px;
  line-height: 37px;
  outline: none;
  padding: 2px 15px;
  width: 100%;
`;

const Title = styled.div`
  background-color: ${p => p.theme.color.background};
  font-size: 12px;
  font-weight: 600;
  left: 10px;
  padding: 0 5px;
  position: absolute;
  top: -6px;
`;

const Wrapper = styled.label`
  color: ${p => p.theme.color.secondary};
  position: relative;

  :focus-within {
    color: ${p => p.theme.color.white};
  }

  ${p => (p.hasError ? errorStyle : "")}
`;

function TextInput({ error, hasError, onChange, title, value, ...props }) {
  return (
    <Wrapper hasError={hasError}>
      <StyledInput
        {...props}
        hasError={hasError}
        onChange={e => onChange(e.target.value)}
        type="text"
        value={value}
      />
      <Title>{title}</Title>
      {error && <Error>{error}</Error>}
    </Wrapper>
  );
}

export default TextInput;
