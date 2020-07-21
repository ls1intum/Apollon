import { css } from '../components/theme/styles';

export const Style = css(
  (props) => `
  text {
    fill: ${props.theme.font.color};
    font-family: ${props.theme.font.family};
    font-size: ${props.theme.font.size}px;
  }

  marker, text {
    fill-opacity: 1;
  }

  * {
    overflow: visible;
  }
`,
);
