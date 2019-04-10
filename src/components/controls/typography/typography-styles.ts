import { css, styled } from '../../theme/styles';

type Props = {
  variant: 'header' | 'body';
};

export const Typography = styled.p<Props>`
  margin-top: 0;

${props =>
  props.variant === 'header' &&
  css`
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.2;
    margin-bottom: 0.5rem;
  `}

${props =>
  props.variant === 'body' &&
  css`
    margin-bottom: 1rem;
  `}
`;
