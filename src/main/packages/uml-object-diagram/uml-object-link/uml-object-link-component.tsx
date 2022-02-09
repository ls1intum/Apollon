import React, { FunctionComponent } from 'react';
import { UMLObjectLink } from './uml-object-link.js';

export const UMLObjectLinkComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <polyline
      points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
      stroke={element.strokeColor || 'black'}
      fill="none"
      strokeWidth={1}
    />
  </g>
);

interface Props {
  element: UMLObjectLink;
}
