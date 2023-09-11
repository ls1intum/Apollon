import React, { FunctionComponent } from 'react';
import { BPMNInclusiveGateway } from './bpmn-inclusive-gateway';
import { ThemedCircle, ThemedPolyline } from '../../../components/theme/themedComponents';

export const BPMNInclusiveGatewayComponent: FunctionComponent<Props> = ({ element, scale, fillColor }) => (
  <g>
    <ThemedPolyline
      points={`${element.bounds.width / 2} 0, ${element.bounds.width} ${element.bounds.height / 2}, ${
        element.bounds.width / 2
      } ${element.bounds.height}, 0 ${element.bounds.height / 2}, ${element.bounds.width / 2} 0`}
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
    />
    <ThemedCircle
      cx="50%"
      cy="50%"
      r={Math.min(element.bounds.width, element.bounds.height) / 2 - 12 * scale}
      strokeColor={element.strokeColor}
    />
  </g>
);

export interface Props {
  element: BPMNInclusiveGateway;
  scale: number;
  fillColor?: string;
}
