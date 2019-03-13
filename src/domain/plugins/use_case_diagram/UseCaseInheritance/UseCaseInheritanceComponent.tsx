import React, { SFC } from 'react';
import UseCaseInheritance from './UseCaseInheritance';

const UseCaseInheritanceComponent: SFC<Props> = ({ element }) => (
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
  element: UseCaseInheritance;
}

export default UseCaseInheritanceComponent;
