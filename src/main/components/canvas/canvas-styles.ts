import { styled } from '../theme/styles';

type Props = {
  isStatic: boolean;
};

export const CanvasContainer = styled.svg.attrs<Props>({
  tabIndex: -1,
})<Props>`
  position: ${({ isStatic }: Props) => (isStatic ? 'static' : 'absolute')};
  top: 0;
  left: 0;
  min-width: 100%;
  min-height: 100%;
  outline: none;
  overflow: visible;
  transform-origin: center center;
  fill: white;
`;
