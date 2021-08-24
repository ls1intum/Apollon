import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component';
import { FlowchartFunctionCall } from './flowchart-function-call';

export const FlowchartFunctionCallComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <FlowchartComponent element={element} scale={scale}>
    <rect width={10 * scale} height="100%" stroke={element.strokeColor || 'black'} x="0" />
    <rect
      width={element.bounds.width - 20 * scale}
      height="100%"
      stroke={element.strokeColor || 'black'}
      x={10 * scale}
    />
    <rect
      width={10 * scale}
      height="100%"
      stroke={element.strokeColor || 'black'}
      x={element.bounds.width - 10 * scale}
    />
  </FlowchartComponent>
);

export interface Props {
  element: FlowchartFunctionCall;
  scale: number;
}
