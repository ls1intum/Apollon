import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component';
import { FlowchartInputOutput } from './flowchart-input-output';

export const FlowchartInputOutputComponent: FunctionComponent<Props> = ({ element }) => (
  <FlowchartComponent element={element}>
    <polyline
      points={`${1.1 * element.bounds.width} 0, ${0.9 * element.bounds.width} ${element.bounds.height}, ${
        -0.1 * element.bounds.width
      } ${element.bounds.height}, ${0.1 * element.bounds.width} 0, ${1.1 * element.bounds.width} 0`}
      stroke="black"
    />
  </FlowchartComponent>
);

export interface Props {
  element: FlowchartInputOutput;
}
