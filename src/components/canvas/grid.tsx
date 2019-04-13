import styled from 'styled-components';

interface Props {
  width: number;
  height: number;
  grid: number;
  show?: boolean;
}

const color1 = '#e5e5e5';
const color2 = '#f5f5f5';
const subdivisions = 5;

export const Grid = styled.div<Props>`
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  min-width: ${({ width }: Props) => width}px;
  min-height: ${({ height }: Props) => height}px;

  ${({ show = true, grid }) =>
    show &&
    `
    &:before {
      content: '';
      display: block;
      position: absolute;
      z-index: -1;
      margin: -1em;
      width: calc(100% + 2em);
      height: calc(100% + 2em);

      background-position: calc(50% + ${(grid * subdivisions) / 2}px) calc(50% + ${(grid * subdivisions) / 2}px);
      background-size: ${grid * subdivisions}px ${grid * subdivisions}px,
        ${grid * subdivisions}px ${grid * subdivisions}px,
        ${grid}px ${grid}px,
        ${grid}px ${grid}px;
      background-image: linear-gradient(to right, ${color1} 1px, transparent 1px),
        linear-gradient(to bottom, ${color1} 1px, transparent 1px),
        linear-gradient(to right, ${color2} 1px, transparent 1px),
        linear-gradient(to bottom, ${color2} 1px, transparent 1px);
      background-repeat: repeat;
    }
  `}
`;
