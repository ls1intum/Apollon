import React, { FunctionComponent } from 'react';
import { ControlFlowComponent } from '../control-flow-element/control-flow-component';
import { ControlFlowProcess } from './control-flow-process';

export const ControlFlowProcessComponent: FunctionComponent<Props> = ({ element }) => (
  <ControlFlowComponent element={element}>
    <rect width="100%" height="100%" stroke="black" />
  </ControlFlowComponent>
);

export interface Props {
  element: ControlFlowProcess;
}
