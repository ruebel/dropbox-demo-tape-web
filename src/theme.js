import { css } from "styled-components";

const color = {
  background: "#242A31",
  backgroundLight: "#2D323C",
  disabled: "#656565",
  error: "#E7777F",
  inherit: "inherit",
  primary: "#D2D2D2",
  secondary: "#b3b3b3",
  success: "#A1CA7E",
  transparent: "transparent",
  white: "#FFFFFF",
};

const space = 5;

const theme = {
  color: {
    ...color,
    highlight: "#5EB1BF",
    bgHighlight: color.primary + "11",
  },
  typography: {
    base: css`
      font-size: 16px;
      line-height: 25px;
    `,
    sub: css`
      font-size: 14px;
      font-weight: 400;
      lint-height: 20px;
    `,
  },
  space: {
    small: space,
    medium: space * 2,
    large: space * 4,
  },
  transition: "all 250ms ease-in",
};

export default theme;
