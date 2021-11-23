import React, { FunctionComponent } from 'react';
import { UMLInterfaceProvided } from './uml-interface-provided';

export const UMLInterfaceProvidedComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <polyline
      points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
      stroke={element.strokeColor || 'black'}
      fill="none"
    />
  </g>
);

interface Props {
  element: UMLInterfaceProvided;
}
