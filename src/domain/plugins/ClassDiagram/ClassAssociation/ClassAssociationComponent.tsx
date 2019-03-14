import React, { SFC } from 'react';
import ClassAssociation from './ClassAssociation';

const ClassAssociationComponent: SFC<Props> = ({ element }) => {
  return (
    <g>
      <polyline
        points={element.path.map(point => `${point.x} ${point.y}`).join(',')}
        stroke="black"
        fill="none"
        strokeWidth={1}
        // markerEnd={marker && `url(#${marker})`}
        // strokeDasharray={dashed}
      />
    </g>
  );
};

interface Props {
  element: ClassAssociation;
}

export default ClassAssociationComponent;
