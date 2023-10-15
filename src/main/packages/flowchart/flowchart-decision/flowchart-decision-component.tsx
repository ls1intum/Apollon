import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component';
import { FlowchartDecision } from './flowchart-decision';
import { ThemedPolyline } from '../../../components/theme/themedComponents';

export const FlowchartDecisionComponent: FunctionComponent<Props> = ({ element, fillColor }) => (
  <FlowchartComponent element={element}>
    <ThemedPolyline
      points={`${element.bounds.width / 2} 0, ${element.bounds.width} ${element.bounds.height / 2}, ${
        element.bounds.width / 2
      } ${element.bounds.height}, 0 ${element.bounds.height / 2}, ${element.bounds.width / 2} 0`}
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
    />
  </FlowchartComponent>
);

export interface Props {
  element: FlowchartDecision;
  fillColor?: string;
}
