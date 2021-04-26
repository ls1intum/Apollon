import React, { SFC } from 'react';
import { UMLInterface } from './uml-interface';

export const UMLInterfaceComponent: SFC<Props> = ({ element }) => (
  <g>
    <circle cx="10px" cy="50%" r={10} stroke={element.color?.stroke || 'black'} strokeWidth={2} />
    <text x="25px" fontWeight="bold" pointerEvents="none">
      {element.name}
    </text>
  </g>
);

interface Props {
  element: UMLInterface;
}
