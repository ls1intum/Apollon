import { styled } from '../theme/styles';

type GhostProps = {
  position: { x: number; y: number };
};

export const Ghost = styled.div.attrs<GhostProps>(({ position }) => ({
  style: { transform: `translate(${position.x}px, ${position.y}px)` },
}))<GhostProps>`
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
  pointer-events: none;
  margin: -5px;
  font-family: ${(props) => props.theme.font.family}, sans-serif;
  font-size: ${(props) => props.theme.font.size}px;

  svg {
    fill-opacity: 0.7;
  }
  text {
    fill: black;
    fill-opacity: 0.7;
  }
`;
