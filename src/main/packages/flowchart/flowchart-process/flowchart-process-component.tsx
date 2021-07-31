import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component';
import { FlowchartProcess } from './flowchart-process';

export const FlowchartProcessComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <FlowchartComponent element={element} scale={scale}>
    <rect width="100%" height="100%" stroke={element.strokeColor || 'black'} />
  </FlowchartComponent>
);

export interface Props {
  element: FlowchartProcess;
  scale: number;
}
