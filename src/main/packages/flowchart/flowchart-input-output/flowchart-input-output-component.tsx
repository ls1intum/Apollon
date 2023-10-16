import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component';
import { FlowchartInputOutput } from './flowchart-input-output';
import { ThemedPolyline } from '../../../components/theme/themedComponents';
import { computeDimension } from '../../../utils/geometry/boundary';

export const FlowchartInputOutputComponent: FunctionComponent<Props> = ({ element, fillColor }) => {
  return (
    <FlowchartComponent element={element}>
      <ThemedPolyline
        points={`${computeDimension(1.1, element.bounds.width)} 0, ${computeDimension(0.9, element.bounds.width)} ${
          element.bounds.height
        }, ${computeDimension(-0.1, element.bounds.width)} ${element.bounds.height}, ${computeDimension(
          0.1,
          element.bounds.width,
        )} 0, ${computeDimension(1.1, element.bounds.width)} 0`}
        strokeColor={element.strokeColor}
        fillColor={fillColor || element.fillColor}
      />
    </FlowchartComponent>
  );
};

export interface Props {
  element: FlowchartInputOutput;
  fillColor?: string;
}
