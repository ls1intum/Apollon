import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component.js';
import { FlowchartTerminal } from './flowchart-terminal.js';

export const FlowchartTerminalComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <FlowchartComponent element={element} scale={scale}>
    <rect rx={10 * scale} ry={10 * scale} width="100%" height="100%" stroke={element.strokeColor || 'black'} />
  </FlowchartComponent>
);

export interface Props {
  element: FlowchartTerminal;
  scale: number;
}
