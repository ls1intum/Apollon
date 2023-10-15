import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component';
import { FlowchartTerminal } from './flowchart-terminal';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const FlowchartTerminalComponent: FunctionComponent<Props> = ({ element, fillColor }) => (
  <FlowchartComponent element={element}>
    <ThemedRect
      fillColor={fillColor || element.fillColor}
      rx={10}
      ry={10}
      width="100%"
      height="100%"
      strokeColor={element.strokeColor}
    />
  </FlowchartComponent>
);

export interface Props {
  element: FlowchartTerminal;
  fillColor?: string;
}
