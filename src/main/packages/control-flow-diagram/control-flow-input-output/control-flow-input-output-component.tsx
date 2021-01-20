import React, { SFC } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { ControlFlowInputOutput } from './control-flow-input-output';

export const ControlFlowInputOutputComponent: SFC<Props> = ({ element }) => (
  <g>
    <polyline
      points={`${1.1 * element.bounds.width} 0, ${0.9 * element.bounds.width} ${element.bounds.height}, ${
        -0.1 * element.bounds.width
      } ${element.bounds.height}, ${0.1 * element.bounds.width} 0, ${1.1 * element.bounds.width} 0`}
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
  element: ControlFlowInputOutput;
}
