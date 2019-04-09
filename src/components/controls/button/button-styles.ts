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
  border-radius: 0.25rem;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  margin: 0;
  overflow: visible;
  padding: 0.375rem 0.75rem;
  text-transform: none;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out;
  user-select: none;

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

export const StyledButton = styled(Button)<typeof defaultProps>(props => {
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
        border-radius: 0.2rem;
        font-size: 0.875rem;
        padding: 0.25rem 0.5rem;
      `}

    ${props.size === 'lg' &&
      css`
        border-radius: 0.3rem;
        font-size: 1.25rem;
        padding: 0.5rem 1rem;
      `}

    ${props.color === 'link' &&
      css`
        color: ${props.theme.color.primary};
        text-decoration: none;
      `}

    ${props.color !== 'link' &&
      css`
        :focus {
          box-shadow: 0 0 0 0.2rem ${color}80;
        }
      `}

    ${props.color !== 'link' &&
      !props.outline &&
      css`
        background-color: ${color};
        border-color: ${color};
        color: ${props.theme.color.white};

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
          color: ${props.theme.color.white};
        }
      `}
  `;
});
