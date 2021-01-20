import React, { SFC } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { ControlFlowDecision } from './control-flow-decision';

export const ControlFlowDecisionComponent: SFC<Props> = ({ element }) => (
  <g>
    <polyline
      points={`${element.bounds.width / 2} 0, ${element.bounds.width} ${element.bounds.height / 2}, ${
        element.bounds.width / 2
      } ${element.bounds.height}, 0 ${element.bounds.height / 2}, ${element.bounds.width / 2} 0`}
      stroke="black"
    />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height / 2}
      width={element.bounds.width}
      height={element.bounds.height}
      fontWeight="bold"
    >
      {element.name}
    </Multiline>
  </g>
);

export interface Props {
  element: ControlFlowDecision;
}
