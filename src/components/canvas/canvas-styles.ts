import { styled } from '../theme/styles';

export const CanvasContainer = styled.svg.attrs({
  tabIndex: -1,
})`
  position: absolute;
  top: 0;
  left: 0;
  min-width: 100%;
  min-height: 100%;
  outline: none;
  overflow: visible;
  transform-origin: center center;
  fill: white;
`;
