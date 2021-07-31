import styled from 'styled-components';

export type ContainerProps = {
  scale?: number;
};

export const Container = styled.aside.attrs<ContainerProps>({})<ContainerProps>`
  flex: ${({ scale }: ContainerProps) => (scale ? `0 0 ${230 * scale}px` : '0 0 230px')};
  padding: ${({ scale }: ContainerProps) => (scale ? `0 ${10 * scale}px` : '0 10px')};
  height: 100%;
  min-height: inherit;
  max-height: inherit;
  overflow: auto;
  display: flex;
  flex-direction: column;

  svg {
    display: block;
    margin-left: auto;
    margin-right: auto;
  }
`;
