import { Omit } from 'react-redux';
import { lighten } from '../../../utils/color';
import { css, styled } from '../../theme/styles';
import { defaultProps } from './textfield';

const FOCUS_BORDER_LIGHTEN = 25;

const Input = styled.input`
  background-clip: padding-box;
  background-color: ${props => props.theme.color.white};
  border: 1px solid ${props => props.theme.color.gray400};
  border-radius: 0.25rem;
  color: ${props => props.theme.color.gray700};
  font-family: ${props => props.theme.font.family};
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  margin: 0;
  overflow: visible;
  padding: 0.375rem 0.75rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;

  :focus {
    border-color: ${props => lighten(props.theme.color.primary, FOCUS_BORDER_LIGHTEN)};
    outline: 0;
    box-shadow: 0 0 0 0.2rem ${props => props.theme.color.primary}40;
  }

  ::placeholder {
    color: ${props => props.theme.color.gray600};
    opacity: 1;
  }
`;

type Props = Omit<typeof defaultProps, 'size'>;

export const StyledTextfield = styled(Input)<Props>(
  props => css`
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
        border-radius: 0.2rem;
        font-size: 0.875rem;
        padding: 0.25rem 0.5rem;
      `}

    ${props.size &&
      props.size === 1 &&
      css`
        border-radius: 0.3rem;
        font-size: 1.25rem;
        padding: 0.5rem 1rem;
      `}
  `,
);
