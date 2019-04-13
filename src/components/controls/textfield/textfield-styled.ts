import { Omit } from 'react-redux';
import { lighten } from '../../../utils/color';
import { css, styled } from '../../theme/styles';
import { defaultProps } from './textfield';

const FOCUS_BORDER_LIGHTEN = 25;

const Input = styled.input`
  background-clip: padding-box;
  background-color: ${props => props.theme.color.white};
  border: 1px solid ${props => props.theme.color.gray400};
  border-radius: 0.25em;
  color: ${props => props.theme.color.gray700};
  font-family: ${props => props.theme.font.body};
  font-size: 1em;
  font-weight: 400;
  line-height: 1.5;
  margin: 0;
  overflow: visible;
  padding: 0.375em 0.75em;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;

  :focus {
    border-color: ${props => lighten(props.theme.color.primary, FOCUS_BORDER_LIGHTEN)};
    outline: 0;
    box-shadow: 0 0 0 0.2em ${props => props.theme.color.primary}40;
  }

  ::placeholder {
    color: ${props => props.theme.color.gray600};
    opacity: 1;
  }
`;

type Props = Omit<typeof defaultProps, 'size'>;

export const StyledTextfield = styled(Input)<Props>(
  props => css`
    ${props.gutter &&
      css`
        margin-bottom: 0.5em;
      `}

    ${props.outline &&
      css`
        &:not(:focus) {
          border-style: dashed;
        }

        &:not(:focus):not(:hover) {
          background: rgba(255, 255, 255, 0.5);
        }
      `}

    ${props.block &&
      css`
        display: block;
        width: 100%;
      `}

    ${props.readonly &&
      css`
        background-color: ${props.theme.color.gray200};
        opacity: 1;
      `}

    ${props.size &&
      props.size === -1 &&
      css`
        border-radius: 0.2em;
        font-size: 0.875em;
        padding: 0.25em 0.5em;
      `}

    ${props.size &&
      props.size === 1 &&
      css`
        border-radius: 0.3em;
        font-size: 1.25em;
        padding: 0.5em 1em;
      `}
  `,
);
