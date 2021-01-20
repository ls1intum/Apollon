import React, { FunctionComponent } from 'react';
import { ControlFlowComponent } from '../control-flow-element/control-flow-component';
import { ControlFlowInputOutput } from './control-flow-input-output';

export const ControlFlowInputOutputComponent: FunctionComponent<Props> = ({ element }) => (
  <ControlFlowComponent element={element}>
    <polyline
      points={`${1.1 * element.bounds.width} 0, ${0.9 * element.bounds.width} ${element.bounds.height}, ${
        -0.1 * element.bounds.width
      } ${element.bounds.height}, ${0.1 * element.bounds.width} 0, ${1.1 * element.bounds.width} 0`}
      stroke="black"
    />
  </ControlFlowComponent>
);

export interface Props {
  element: ControlFlowInputOutput;
}
