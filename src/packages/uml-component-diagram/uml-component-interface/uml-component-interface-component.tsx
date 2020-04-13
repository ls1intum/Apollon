import React, { SFC } from 'react';
import { UMLComponentInterface } from './uml-component-interface';

export const UMLComponentInterfaceComponent: SFC<Props> = ({ element }) => (
  <g>
    <circle cx="10px" cy="50%" r={10} stroke="black" strokeWidth={2} />
    <text x="20px" fontWeight="bold" pointerEvents="none">
      {element.name}
    </text>
  </g>
);

interface Props {
  element: UMLComponentInterface;
}
