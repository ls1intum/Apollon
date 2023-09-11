import React, { FunctionComponent } from 'react';
import { BPMNSequenceFlow } from './bpmn-sequence-flow';
import { ThemedPolyline } from '../../../components/theme/themedComponents';

export const BPMNSequenceFlowComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <ThemedPolyline
      points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
      strokeColor={element.strokeColor}
      fillColor="none"
      strokeWidth={1}
    />
  </g>
);

interface Props {
  element: BPMNSequenceFlow;
}
