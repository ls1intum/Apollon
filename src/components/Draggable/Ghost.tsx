import styled from 'styled-components';

interface GhostProps {
  x: number;
  y: number;
}

const Ghost = styled.div.attrs<GhostProps>(({ x, y }) => ({
  style: { left: x + 'px', top: y + 'px' },
}))<GhostProps>`
  position: absolute;
  width: 110px;
  height: 80px;
  line-height: 80px;
  text-align: center;
  border: thin dashed blue;
  z-index: 10;
  pointer-events: none;
`;

export default Ghost;
