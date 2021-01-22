import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component';
import { FlowchartTerminal } from './flowchart-terminal';

export const FlowchartTerminalComponent: FunctionComponent<Props> = ({ element }) => (
  <FlowchartComponent element={element}>
    <rect rx={10} ry={10} width="100%" height="100%" stroke="black" />
  </FlowchartComponent>
);

export interface Props {
  element: FlowchartTerminal;
}
