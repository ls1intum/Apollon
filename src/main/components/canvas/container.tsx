import { styled } from '../theme/styles';

const grid = 10;
const color1 = '#e5e5e5';
const color2 = '#f5f5f5';
const subdivisions = 5;

export const Editor = styled.div`
  display: block;
  width: 100%;
  position: relative;
  min-height: inherit;
  max-height: inherit;
  max-width: inherit;

  overflow: auto;
  -ms-overflow-style: -ms-autohiding-scrollbar;
  border: 1px solid ${(props) => props.theme.color.gray500};

  background-position: calc(50% + ${(grid * subdivisions) / 2}px) calc(50% + ${(grid * subdivisions) / 2}px);
  background-size: ${grid * subdivisions}px ${grid * subdivisions}px, ${grid * subdivisions}px ${grid * subdivisions}px,
    ${grid}px ${grid}px, ${grid}px ${grid}px;
  background-image: linear-gradient(to right, ${color1} 1px, transparent 1px),
    linear-gradient(to bottom, ${color1} 1px, transparent 1px),
    linear-gradient(to right, ${color2} 1px, transparent 1px),
    linear-gradient(to bottom, ${color2} 1px, transparent 1px);
  background-repeat: repeat;
  background-attachment: local;
`;
