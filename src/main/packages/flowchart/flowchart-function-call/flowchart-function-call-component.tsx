import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component';
import { FlowchartFunctionCall } from './flowchart-function-call';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const FlowchartFunctionCallComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <FlowchartComponent element={element} scale={scale}>
    <ThemedRect
      fillColor={element.fillColor}
      width={10 * scale}
      height="100%"
      strokeColor={element.strokeColor}
      x="0"
    />
    <ThemedRect
      width={element.bounds.width - 20 * scale}
      height="100%"
      strokeColor={element.strokeColor}
      x={10 * scale}
      fillColor={element.fillColor}
    />
    <ThemedRect
      width={10 * scale}
      height="100%"
      strokeColor={element.strokeColor}
      x={element.bounds.width - 10 * scale}
      fillColor={element.fillColor}
    />
  </FlowchartComponent>
);

export interface Props {
  element: FlowchartFunctionCall;
  scale: number;
}
