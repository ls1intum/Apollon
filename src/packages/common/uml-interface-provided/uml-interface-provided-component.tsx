import React, { SFC } from 'react';
import { UMLInterfaceProvided } from './uml-interface-provided';

export const UMLInterfaceProvidedComponent: SFC<Props> = ({ element }) => (
  <g>
    <polyline points={element.path.map(point => `${point.x} ${point.y}`).join(',')} stroke="black" fill="none" />
  </g>
);

interface Props {
  element: UMLInterfaceProvided;
}
