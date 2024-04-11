import styled from 'styled-components';

export type ContainerProps = {};

export const Container = styled.aside.attrs<ContainerProps>({})<ContainerProps>`
  flex: 0 0 148px;
  padding: 0 10px;
  height: 100%;
  min-height: inherit;
  max-height: inherit;
  overflow-x: hidden;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;

  svg {
    display: block;
    margin-left: auto;
    margin-right: auto;
  }
`;
