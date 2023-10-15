import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component';
import { FlowchartProcess } from './flowchart-process';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const FlowchartProcessComponent: FunctionComponent<Props> = ({ element, fillColor }) => (
  <FlowchartComponent element={element}>
    <ThemedRect
      width="100%"
      height="100%"
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
    />
  </FlowchartComponent>
);

export interface Props {
  element: FlowchartProcess;
  fillColor?: string;
}
