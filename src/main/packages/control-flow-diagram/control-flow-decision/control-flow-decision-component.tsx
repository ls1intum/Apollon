import React, { FunctionComponent } from 'react';
import { ControlFlowComponent } from '../control-flow-element/control-flow-component';
import { ControlFlowDecision } from './control-flow-decision';

export const ControlFlowDecisionComponent: FunctionComponent<Props> = ({ element }) => (
  <ControlFlowComponent element={element}>
    <polyline
      points={`${element.bounds.width / 2} 0, ${element.bounds.width} ${element.bounds.height / 2}, ${
        element.bounds.width / 2
      } ${element.bounds.height}, 0 ${element.bounds.height / 2}, ${element.bounds.width / 2} 0`}
      stroke="black"
    />
  </ControlFlowComponent>
);

export interface Props {
  element: ControlFlowDecision;
}
