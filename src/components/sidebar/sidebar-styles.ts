import styled from 'styled-components';
import { hoverable } from '../layouted-element/hoverable';
import { CanvasElement } from '../uml-element/canvas-element';

export const Container = styled.aside`
  flex: 0 0 230px;
  padding: 0 10px;
  height: 100%;
  min-height: inherit;
  max-height: inherit;
  overflow: auto;
  display: flex;
  flex-direction: column;
`;

export const Preview = styled(hoverable(CanvasElement))`
  margin: 5px;
  overflow: visible;
`;
