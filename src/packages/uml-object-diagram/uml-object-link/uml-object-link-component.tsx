import React, { SFC } from 'react';
import { UMLObjectLink } from './uml-object-link';

export const UMLObjectLinkComponent: SFC<Props> = ({ element }) => (
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
  element: UMLObjectLink;
}
