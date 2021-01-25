import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component';
import { FlowchartProcess } from './flowchart-process';

export const FlowchartProcessComponent: FunctionComponent<Props> = ({ element }) => (
  <FlowchartComponent element={element}>
    <rect width="100%" height="100%" stroke="black" />
  </FlowchartComponent>
);

export interface Props {
  element: FlowchartProcess;
}
