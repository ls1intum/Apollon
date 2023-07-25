import { lighten } from '../../../utils/color';
import { css, styled, Styles } from '../../theme/styles';
import { defaultProps } from './textfield';

const FOCUS_BORDER_LIGHTEN = 25;

const Input = styled.textarea`
  background-clip: padding-box;
  background-color: ${(props) => props.theme.color.background};
  border: 1px solid ${(props) => props.theme.color.grayAccent};
  border-radius: 0.25em;
  color: ${(props) => props.theme.color.grayAccent};
  font-family: ${(props) => props.theme.font.family}, sans-serif;
  font-size: 1em;
  font-weight: 400;
  line-height: 1.5;
  margin: 0;
  overflow: visible;
  padding: 0.375em 0.75em;
  transition:
    border-color 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out;

  :focus {
    border-color: ${(props) => lighten(props.theme.color.primary, FOCUS_BORDER_LIGHTEN)};
    outline: 0;
    box-shadow: 0 0 0 0.2em ${(props) => props.theme.color.primary}40;
  }

  ::placeholder {
    color: ${(props) => props.theme.color.grayAccent};
    opacity: 1;
  }
`;

type Props = typeof defaultProps;

export const StyledTextfield = styled(Input)<Props>(
  (props: Props & { theme: Styles }) => css`
    ${props.gutter &&
    css`
      margin-bottom: 0.5em;
    `}

    ${props.multiline &&
    css`
      resize: vertical;
    `}

    ${props.outline &&
    css`
      &:not(:focus) {
        border-style: dashed;
      }

      &:not(:focus):not(:hover) {
        background: ${props.theme.color.background};
        opacity: 0.5;
      }
    `}

    ${props.block &&
    css`
      display: block;
      width: 100%;
    `}

    ${props.readonly &&
    css`
      background-color: ${props.theme.color.gray};
      opacity: 1;
    `}

    ${props.size &&
    props.size === 'sm' &&
    css`
      border-radius: 0.2em;
      font-size: 0.875em;
      padding: 0.25em 0.5em;
    `}

    ${props.size &&
    props.size === 'lg' &&
    css`
      border-radius: 0.3em;
      font-size: 1.25em;
      padding: 0.5em 1em;
    `}
  `,
);
