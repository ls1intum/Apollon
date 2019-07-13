import React, { SFC } from 'react';
import { UMLComponentInterfaceProvided } from './uml-component-interface-provided';

export const UMLComponentInterfaceProvidedComponent: SFC<Props> = ({ element }) => (
  <g>
    <polyline points={element.path.map(point => `${point.x} ${point.y}`).join(',')} stroke="black" fill="none" />
  </g>
);

interface Props {
  element: UMLComponentInterfaceProvided;
}
