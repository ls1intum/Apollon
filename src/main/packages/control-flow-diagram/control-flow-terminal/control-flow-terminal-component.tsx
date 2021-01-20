import React, { FunctionComponent } from 'react';
import { ControlFlowComponent } from '../control-flow-element/control-flow-component';
import { ControlFlowTerminal } from './control-flow-terminal';

export const ControlFlowTerminalComponent: FunctionComponent<Props> = ({ element }) => (
  <ControlFlowComponent element={element}>
    <rect rx={10} ry={10} width="100%" height="100%" stroke="black" />
  </ControlFlowComponent>
);

export interface Props {
  element: ControlFlowTerminal;
}
