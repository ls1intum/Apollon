import React, { SFC } from 'react';
import UseCaseGeneralization from './UseCaseGeneralization';

const UseCaseGeneralizationComponent: SFC<Props> = ({ element }) => (
  <g>
    <polyline
      points={element.path.map(point => `${point.x} ${point.y}`).join(',')}
      stroke="black"
      fill="none"
      strokeWidth={1}
      markerEnd="url(#RelationshipKind_Triangle)"
    />
  </g>
);

interface Props {
  element: UseCaseGeneralization;
}

export default UseCaseGeneralizationComponent;
