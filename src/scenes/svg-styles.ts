import { css } from '../components/theme/styles';

export const Style = css(
  props => `
  text {
    fill: ${props.theme.font.color};
    font-family: ${props.theme.font.body};
    font-size: ${props.theme.font.size}px;
  }
  * {
    overflow: visible;
  }
`,
);
