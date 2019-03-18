import React, { SFC } from 'react';
import UseCaseAssociation from './UseCaseAssociation';

const UseCaseAssociationComponent: SFC<Props> = ({ element }) => (
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
  element: UseCaseAssociation;
}

export default UseCaseAssociationComponent;
