import React, { FunctionComponent } from 'react';
import { ControlFlowComponent } from '../control-flow-element/control-flow-component';
import { ControlFlowFunctionCall } from './control-flow-function-call';

export const ControlFlowFunctionCallComponent: FunctionComponent<Props> = ({ element }) => (
  <ControlFlowComponent element={element}>
    <rect width="10px" height="100%" stroke="black" x="0" />
    <rect width="calc(100% - 20px)" height="100%" stroke="black" x="10" />
    <rect width="10px" height="100%" stroke="black" x="calc(100% - 10px)" />
  </ControlFlowComponent>
);

export interface Props {
  element: ControlFlowFunctionCall;
}
