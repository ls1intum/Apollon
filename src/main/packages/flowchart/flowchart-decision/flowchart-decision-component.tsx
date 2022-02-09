import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component.js';
import { FlowchartDecision } from './flowchart-decision.js';

export const FlowchartDecisionComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <FlowchartComponent element={element} scale={scale}>
    <polyline
      points={`${element.bounds.width / 2} 0, ${element.bounds.width} ${element.bounds.height / 2}, ${
        element.bounds.width / 2
      } ${element.bounds.height}, 0 ${element.bounds.height / 2}, ${element.bounds.width / 2} 0`}
      stroke={element.strokeColor || 'black'}
    />
  </FlowchartComponent>
);

export interface Props {
  element: FlowchartDecision;
  scale: number;
}
