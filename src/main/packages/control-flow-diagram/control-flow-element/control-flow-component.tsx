import React, { FunctionComponent } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { ControlFlowElement } from '../index';

export const ControlFlowComponent: FunctionComponent<Props> = ({ element, children }) => (
  <g>
    {children}
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
  element: ControlFlowElement;
}
