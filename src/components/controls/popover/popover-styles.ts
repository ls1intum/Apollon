import { css, styled } from '../../theme/styles';
import { Props } from './popover';

export const PopoverContainer = styled.div<Props>`
  background-clip: padding-box;
  background-color: ${props => props.theme.color.gray100};
  border: 1px solid ${props => props.theme.color.black}33;
  border-radius: 0.3rem;
  box-sizing: border-box;
  display: block;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.2));
  font-family: ${props => props.theme.font.family};
  font-size: 0.875rem;
  font-style: normal;
  font-weight: 400;
  left: 0;
  letter-spacing: normal;
  line-break: auto;
  line-height: 1.5;
  max-width: 276px;
  position: absolute;
  text-align: left;
  text-align: start;
  text-decoration: none;
  text-transform: none;
  text-shadow: none;
  top: 0;
  white-space: normal;
  word-break: normal;
  word-spacing: normal;
  word-wrap: break-word;
  z-index: 1060;

  *,
  *:before,
  *:after {
    box-sizing: inherit;
  }

  ${props => css`
    transform: translate(${props.position.x}px, ${props.position.y}px);
    will-change: transform;
  `}

  ${props =>
    props.placement === 'top' &&
    css`
      margin-bottom: 0.5rem;
    `}

  ${props =>
    props.placement === 'right' &&
    css`
      margin-left: 0.5rem;
    `}

  ${props =>
    props.placement === 'bottom' &&
    css`
      margin-top: 0.5rem;
    `}

  ${props =>
    props.placement === 'left' &&
    css`
      margin-right: 0.5rem;
    `}
`;

export const PopoverBody = styled.div`
  color: ${props => props.theme.font.color};
  padding: 0.5rem 0.75rem;
`;

const ArrowTop = css`
  bottom: calc((0.5rem + 1px) * -1);

  &::before {
    border-top-color: ${props => props.theme.color.black}33;
    border-width: 0.5rem 0.5rem 0;
    bottom: 0;
  }

  &::after {
    border-top-color: ${props => props.theme.color.gray100};
    border-width: 0.5rem 0.5rem 0;
    bottom: 1px;
  }
`;

const ArrowRight = css`
  height: 1rem;
  left: calc((0.5rem + 1px) * -1);
  margin: 0.3rem 0;
  width: 0.5rem;

  &::before {
    border-right-color: ${props => props.theme.color.black}33;
    border-width: 0.5rem 0.5rem 0.5rem 0;
    left: 0;
  }

  &::after {
    border-right-color: ${props => props.theme.color.gray100};
    border-width: 0.5rem 0.5rem 0.5rem 0;
    left: 1px;
  }
`;

const ArrowBottom = css`
  top: calc((0.5rem + 1px) * -1);

  &::before {
    border-bottom-color: ${props => props.theme.color.black}33;
    border-width: 0 0.5rem 0.5rem 0.5rem;
    top: 0;
  }

  &::after {
    border-bottom-color: ${props => props.theme.color.gray100};
    border-width: 0 0.5rem 0.5rem 0.5rem;
    top: 1px;
  }
`;

const ArrowLeft = css`
  height: 1rem;
  margin: 0.3rem 0;
  right: calc((0.5rem + 1px) * -1);
  width: 0.5rem;

  &::before {
    border-left-color: ${props => props.theme.color.black}33;
    border-width: 0.5rem 0 0.5rem 0.5rem;
    right: 0;
  }

  &::after {
    border-left-color: ${props => props.theme.color.gray100};
    border-width: 0.5rem 0 0.5rem 0.5rem;
    right: 1px;
  }
`;

type ArrowProps = Pick<Props, 'placement'>;

export const Arrow = styled.div<ArrowProps>`
  display: block;
  height: 0.5rem;
  margin: 0 0.3rem;
  position: absolute;
  width: 1rem;

  &::before,
  &::after {
    content: '';
    border-color: transparent;
    border-style: solid;
    display: block;
    position: absolute;
  }

  ${props => props.placement === 'top' && ArrowTop}
  ${props => props.placement === 'right' && ArrowRight}
  ${props => props.placement === 'bottom' && ArrowBottom}
  ${props => props.placement === 'left' && ArrowLeft}
`;
