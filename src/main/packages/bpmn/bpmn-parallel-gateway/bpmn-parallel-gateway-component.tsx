import React, { FunctionComponent } from 'react';
import { BPMNParallelGateway } from './bpmn-parallel-gateway';
import { ThemedPolyline } from '../../../components/theme/themedComponents';

export const BPMNParallelGatewayComponent: FunctionComponent<Props> = ({ element, scale, fillColor }) => (
  <g>
    <ThemedPolyline
      points={`${element.bounds.width / 2} 0, ${element.bounds.width} ${element.bounds.height / 2}, ${
        element.bounds.width / 2
      } ${element.bounds.height}, 0 ${element.bounds.height / 2}, ${element.bounds.width / 2} 0`}
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
    />
    <ThemedPolyline
      points={`${element.bounds.width / 2} 10, ${element.bounds.width / 2} ${element.bounds.height - 10}`}
      strokeColor={element.strokeColor}
      fillColor={element.fillColor}
    />
    <ThemedPolyline
      points={`10 ${element.bounds.height / 2}, ${element.bounds.width - 10} ${element.bounds.height / 2}`}
      strokeColor={element.strokeColor}
      fillColor={element.fillColor}
    />
  </g>
);

export interface Props {
  element: BPMNParallelGateway;
  scale: number;
  fillColor?: string;
}
