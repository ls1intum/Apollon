import React, { SFC } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { ControlFlowFunctionCall } from './control-flow-function-call';

export const ControlFlowFunctionCallComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect width="10px" height="100%" stroke="black" x="0" />
    <rect width="calc(100% - 20px)" height="100%" stroke="black" x="10" />
    <rect width="10px" height="100%" stroke="black" x="calc(100% - 10px)" />
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
  element: ControlFlowFunctionCall;
}
