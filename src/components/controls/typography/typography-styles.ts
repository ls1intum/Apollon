import { css, styled } from '../../theme/styles';
import { defaultProps } from './typography';

type Props = {
  variant: 'header' | 'body';
} & typeof defaultProps;

export const Typography = styled.p<Props>`
  margin-top: 0;

  ${(props) =>
    props.variant === 'header' &&
    css`
      font-size: 1.25em;
      font-weight: 500;
      line-height: 1.2;
      margin-bottom: 0.5em;
    `}

  ${(props) =>
    props.variant === 'body' &&
    css`
      margin-bottom: 1em;
    `}

  ${(props) =>
    !props.gutter &&
    css`
      margin-bottom: 0;
    `}
`;
