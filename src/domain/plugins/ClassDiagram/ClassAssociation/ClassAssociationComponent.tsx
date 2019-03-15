import React, { SFC } from 'react';
import ClassAssociation from './ClassAssociation';

const ClassAssociationComponent: SFC<Props> = ({ element }) => {
  const marker = (type => {
    switch (type) {
      case ClassAssociation.types.Dependency:
      case ClassAssociation.types.UnidirectionalAssociation:
        return 'url(#RelationshipKind_Arrow)';
      case ClassAssociation.types.Aggregation:
        return 'url(#RelationshipKind_Rhombus)';
      case ClassAssociation.types.Composition:
        return 'url(#RelationshipKind_RhombusFilled)';
      case ClassAssociation.types.Inheritance:
      case ClassAssociation.types.Realization:
        return 'url(#RelationshipKind_Triangle)';
    }
  })(element.type);

  const stroke = (type => {
    switch (type) {
      case ClassAssociation.types.Dependency:
      case ClassAssociation.types.Realization:
        return 7;
    }
  })(element.type);

  return (
    <g>
      <polyline
        points={element.path.map(point => `${point.x} ${point.y}`).join(',')}
        stroke="black"
        fill="none"
        strokeWidth={1}
        markerEnd={marker}
        strokeDasharray={stroke}
      />
    </g>
  );
};

interface Props {
  element: ClassAssociation;
}

export default ClassAssociationComponent;
