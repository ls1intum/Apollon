import { css, styled } from '../../theme/styles';
import { Props } from './popover';

export const PopoverContainer = styled.div<Props>`
  background-clip: padding-box;
  background-color: ${(props) => props.theme.color.backgroundVariant};
  border: 1px solid ${(props) => props.theme.color.primaryContrast}33;
  border-radius: 0.3em;
  box-sizing: border-box;
  display: block;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.2));
  font-family: ${(props) => props.theme.font.family}, sans-serif;
  font-size: ${(props) => props.theme.font.size}px;
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
  will-change: transform;
  white-space: normal;
  word-break: normal;
  word-spacing: normal;
  word-wrap: break-word;

  *,
  *:before,
  *:after {
    box-sizing: inherit;
  }

  ${(props) => {
    let x = `${props.position.x}px`;
    let y = `${props.position.y}px`;
    const alignment = props.alignment === 'start' ? 0 : props.alignment === 'end' ? 100 : 50;
    switch (props.placement) {
      case 'top':
        x += ` - ${alignment}%`;
        y += ` - 100% - 0.5em`;
        break;
      case 'right':
        x += ` + 0.5em`;
        y += ` - ${alignment}%`;
        break;
      case 'bottom':
        x += ` - ${alignment}%`;
        y += ` + 0.5em`;
        break;
      case 'left':
        x += ` - 100% - 0.5em`;
        y += ` - ${alignment}%`;
        break;
    }

    return css`
      transform: translate(calc(${x}), calc(${y}));
    `;
  }}
`;

export const PopoverBody = styled.div<Pick<Props, 'maxHeight'>>`
  color: ${(props) => props.theme.font.color};
  padding: 0.5em 0.75em;

  ${(props) =>
    props.maxHeight &&
    css`
      max-height: ${props.maxHeight}px;
      overflow: auto;
    `}
`;

const ArrowTop = css`
  bottom: calc((0.5em + 1px) * -1);

  &::before {
    border-top-color: ${(props) => props.theme.color.primaryContrast}33;
    border-width: 0.5em 0.5em 0;
    bottom: 0;
  }

  &::after {
    border-top-color: ${(props) => props.theme.color.gray};
    border-width: 0.5em 0.5em 0;
    bottom: 1px;
  }
`;

const ArrowRight = css`
  height: 1em;
  left: calc((0.5em + 1px) * -1);
  width: 0.5em;

  &::before {
    border-right-color: ${(props) => props.theme.color.primaryContrast}33;
    border-width: 0.5em 0.5em 0.5em 0;
    left: 0;
  }

  &::after {
    border-right-color: ${(props) => props.theme.color.gray};
    border-width: 0.5em 0.5em 0.5em 0;
    left: 1px;
  }
`;

const ArrowBottom = css`
  top: calc((0.5em + 1px) * -1);

  &::before {
    border-bottom-color: ${(props) => props.theme.color.primaryContrast}33;
    border-width: 0 0.5em 0.5em 0.5em;
    top: 0;
  }

  &::after {
    border-bottom-color: ${(props) => props.theme.color.gray};
    border-width: 0 0.5em 0.5em 0.5em;
    top: 1px;
  }
`;

const ArrowLeft = css`
  height: 1em;
  right: calc((0.5em + 1px) * -1);
  width: 0.5em;

  &::before {
    border-left-color: ${(props) => props.theme.color.primaryContrast}33;
    border-width: 0.5em 0 0.5em 0.5em;
    right: 0;
  }

  &::after {
    border-left-color: ${(props) => props.theme.color.gray};
    border-width: 0.5em 0 0.5em 0.5em;
    right: 1px;
  }
`;

type ArrowProps = Pick<Props, 'placement' | 'alignment'>;

export const Arrow = styled.div<ArrowProps>`
  display: block;
  height: 0.5em;
  position: absolute;
  width: 1em;

  &::before,
  &::after {
    content: '';
    border-color: transparent;
    border-style: solid;
    display: block;
    position: absolute;
  }

  ${(props) => props.placement === 'top' && ArrowTop}
  ${(props) => props.placement === 'right' && ArrowRight}
  ${(props) => props.placement === 'bottom' && ArrowBottom}
  ${(props) => props.placement === 'left' && ArrowLeft}

  ${(props) =>
    props.placement === 'top' || props.placement === 'bottom'
      ? props.alignment === 'start'
        ? 'left: 0.3em;'
        : props.alignment === 'end'
          ? 'right: 0.3em;'
          : 'left: 50%; transform: translate(-50%, 0);'
      : props.alignment === 'start'
        ? 'top: 0.3em;'
        : props.alignment === 'end'
          ? 'bottom: 0.3em;'
          : 'top: 50%; transform: translate(0, -50%);'}
`;
