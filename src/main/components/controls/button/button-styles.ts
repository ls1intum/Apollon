import { darken } from '../../../utils/color';
import { css, styled } from '../../theme/styles';
import { defaultProps } from './button';

const HOVER_BACKGROUND_DARKEN = 7.5;
const HOVER_BORDER_DARKEN = 10;
const ACTIVE_BACKGROUND_DARKEN = 10;
const ACTIVE_BORDER_DARKEN = 12.5;

const Button = styled.button`
  appearance: button;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 0.25em;
  font-family: inherit;
  font-size: 1em;
  font-weight: 400;
  line-height: 1.5;
  margin: 0;
  overflow: visible;
  padding: 0.375em 0.75em;
  text-transform: none;
  transition:
    color 0.15s ease-in-out,
    background-color 0.15s ease-in-out,
    border-color 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out;
  user-select: none;

  svg {
    pointer-events: none;
  }

  ::-moz-focus-inner {
    border-style: none;
    padding: 0;
  }

  :focus {
    outline: 0;
  }

  :not(:disabled) {
    cursor: pointer;
  }
`;

export const StyledButton = styled(Button)<typeof defaultProps>((props) => {
  const color = props.color !== 'link' ? props.theme.color[props.color] : props.theme.color.primary;

  return css`
    ${props.block &&
    css`
      display: block;
      width: 100%;
    `}

    ${props.disabled &&
    css`
      opacity: 0.65;
    `}

    ${props.size === 'sm' &&
    css`
      border-radius: 0.2em;
      font-size: 0.875em;
      padding: 0.25em 0.5em;
    `}

    ${props.size === 'lg' &&
    css`
      border-radius: 0.3em;
      font-size: 1.25em;
      padding: 0.5em 1em;
    `}

    ${props.color === 'link' &&
    css`
      color: ${props.theme.color.primary};
      text-decoration: none;
      fill: ${props.theme.color.primaryContrast};
    `}

    ${props.color !== 'link' &&
    css`
      :focus {
        box-shadow: 0 0 0 0.2em ${color}80;
      }
    `}

    ${props.color !== 'link' &&
    !props.outline &&
    css`
      background-color: ${color};
      border-color: ${color};
      color: ${props.theme.color.background};

      :hover {
        background-color: ${darken(color, HOVER_BACKGROUND_DARKEN)};
        border-color: ${darken(color, HOVER_BORDER_DARKEN)};
      }

      :active {
        background-color: ${darken(color, ACTIVE_BACKGROUND_DARKEN)};
        border-color: ${darken(color, ACTIVE_BORDER_DARKEN)};
      }
    `}

    ${props.color !== 'link' &&
    props.outline &&
    css`
      border-color: ${color};
      color: ${color};

      :hover {
        background-color: ${color};
        color: ${props.theme.color.background};
      }
    `}
  `;
});
