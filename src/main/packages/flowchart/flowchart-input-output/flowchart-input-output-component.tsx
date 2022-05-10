import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component';
import { FlowchartInputOutput } from './flowchart-input-output';
import { ThemedPolyline } from '../../../components/theme/themedComponents';

export const FlowchartInputOutputComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <FlowchartComponent element={element} scale={scale}>
    <ThemedPolyline
      points={`${1.1 * element.bounds.width} 0, ${0.9 * element.bounds.width} ${element.bounds.height}, ${
        -0.1 * element.bounds.width
      } ${element.bounds.height}, ${0.1 * element.bounds.width} 0, ${1.1 * element.bounds.width} 0`}
      strokeColor={element.strokeColor}
    />
  </FlowchartComponent>
);

export interface Props {
  element: FlowchartInputOutput;
  scale: number;
}
