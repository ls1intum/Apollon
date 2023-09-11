import React, { FunctionComponent } from 'react';
import { BPMNExclusiveGateway } from './bpmn-exclusive-gateway';
import { ThemedPolyline } from '../../../components/theme/themedComponents';

export const BPMNExclusiveGatewayComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <g>
    <ThemedPolyline
      points={`${element.bounds.width / 2} 0, ${element.bounds.width} ${element.bounds.height / 2}, ${
        element.bounds.width / 2
      } ${element.bounds.height}, 0 ${element.bounds.height / 2}, ${element.bounds.width / 2} 0`}
      strokeColor={element.strokeColor}
      fillColor={element.fillColor}
    />
    <ThemedPolyline
      points={`12 12, ${element.bounds.width - 12} ${element.bounds.height - 12}`}
      strokeColor={element.strokeColor}
      fillColor={element.fillColor}
    />
    <ThemedPolyline
      points={`12 ${element.bounds.height - 12}, ${element.bounds.width - 12} 12`}
      strokeColor={element.strokeColor}
      fillColor={element.fillColor}
    />
  </g>
);

export interface Props {
  element: BPMNExclusiveGateway;
  scale: number;
}
