import styled from 'styled-components';

interface ContainerProps {
  movable: boolean;
  moving: boolean;
}

export const Container = styled.svg.attrs({
  pointerEvents: 'all',
})<ContainerProps>`
  cursor: ${({ movable }) => (movable ? 'move' : 'default')};
  opacity: ${({ moving }) => (moving ? 0.35 : 1)};
  overflow: visible;
`;
