import React, { SFC } from 'react';
import { ComponentInterfaceProvided } from './component-interface-provided';

export const ComponentInterfaceProvidedComponent: SFC<Props> = ({ element }) => (
  <g>
    <polyline
      points={element.path.map(point => `${point.x} ${point.y}`).join(',')}
      stroke="black"
      fill="none"
      strokeWidth={1}
    />
  </g>
);

interface Props {
  element: ComponentInterfaceProvided;
}
