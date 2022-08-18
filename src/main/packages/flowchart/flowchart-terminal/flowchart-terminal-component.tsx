import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component';
import { FlowchartTerminal } from './flowchart-terminal';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const FlowchartTerminalComponent: FunctionComponent<Props> = ({ element, scale, fillColor }) => (
  <FlowchartComponent element={element} scale={scale}>
    <ThemedRect
      fillColor={fillColor || element.fillColor}
      rx={10 * scale}
      ry={10 * scale}
      width="100%"
      height="100%"
      strokeColor={element.strokeColor}
    />
  </FlowchartComponent>
);

export interface Props {
  element: FlowchartTerminal;
  scale: number;
  fillColor?: string;
}
