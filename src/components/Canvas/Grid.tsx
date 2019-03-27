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

export default styled.div<Props>`
  position: relative;
  z-index: 1;
  width: ${({ width }: Props) => width + 1}px;
  height: ${({ height }: Props) => height + 1}px;

  ${({ show = true, grid }) =>
    show &&
    `
    &:before {
      content: '';
      display: block;
      position: absolute;
      z-index: -1;
      width: 100%;
      height: 100%;

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
