import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component';
import { FlowchartInputOutput } from './flowchart-input-output';
import { ThemedPolyline } from '../../../components/theme/themedComponents';

export const FlowchartInputOutputComponent: FunctionComponent<Props> = ({ element, scale, fillColor }) => {
  return (
    <FlowchartComponent element={element} scale={scale}>
      <ThemedPolyline
        points={`${(13 / 12) * element.bounds.width} 0, ${(11 / 12) * element.bounds.width} ${element.bounds.height}, ${
          -(1 / 12) * element.bounds.width
        } ${element.bounds.height}, ${(1 / 12) * element.bounds.width} 0, ${(13 / 12) * element.bounds.width} 0`}
        strokeColor={element.strokeColor}
        fillColor={fillColor || element.fillColor}
      />
    </FlowchartComponent>
  );
};

export interface Props {
  element: FlowchartInputOutput;
  scale: number;
  fillColor?: string;
}
