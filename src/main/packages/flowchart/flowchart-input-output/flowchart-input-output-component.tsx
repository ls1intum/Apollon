import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component.js';
import { FlowchartInputOutput } from './flowchart-input-output.js';

export const FlowchartInputOutputComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <FlowchartComponent element={element} scale={scale}>
    <polyline
      points={`${1.1 * element.bounds.width} 0, ${0.9 * element.bounds.width} ${element.bounds.height}, ${
        -0.1 * element.bounds.width
      } ${element.bounds.height}, ${0.1 * element.bounds.width} 0, ${1.1 * element.bounds.width} 0`}
      stroke={element.strokeColor || 'black'}
    />
  </FlowchartComponent>
);

export interface Props {
  element: FlowchartInputOutput;
  scale: number;
}
