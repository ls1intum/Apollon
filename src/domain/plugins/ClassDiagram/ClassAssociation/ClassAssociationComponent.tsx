import React, { SFC } from 'react';
import ClassAssociation from './ClassAssociation';
import Point from '../../../geometry/Point';
import Port from '../../../Port';

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

  const computeTextPosition = (
    path: Point[],
    marker: boolean = false
  ): Point => {
    const distance = marker ? 31 : 8;
    const vector = path[1].subtract(path[0]);
    return path[0].add(vector.normalize().scale(distance));
  };

  const layoutText = (
    location: Port['location'],
    position: 'TOP' | 'BOTTOM'
  ) => {
    switch (location) {
      case 'N':
        return {
          dx: position === 'TOP' ? -5 : 5,
          dominantBaseline: 'text-after-edge',
          textAnchor: position === 'TOP' ? 'end' : 'start',
        };
      case 'E':
        return {
          dy: position === 'TOP' ? -5 : 5,
          dominantBaseline:
            position === 'TOP' ? 'text-after-edge' : 'text-before-edge',
          textAnchor: 'start',
        };
      case 'S':
        return {
          dx: position === 'TOP' ? -5 : 5,
          dominantBaseline: 'text-before-edge',
          textAnchor: position === 'TOP' ? 'end' : 'start',
        };
      case 'W':
        return {
          dy: position === 'TOP' ? -5 : 5,
          dominantBaseline:
            position === 'TOP' ? 'text-after-edge' : 'text-before-edge',
          textAnchor: 'end',
        };
    }
  };

  const path = element.path.map(point => new Point(point.x, point.y));
  const source: Point = computeTextPosition(path);
  const target: Point = computeTextPosition(path.reverse(), !!marker);

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
      <text
        x={source.x}
        y={source.y}
        {...layoutText(element.source.location, 'BOTTOM')}
      >
        {element.multiplicity.source}
      </text>
      <text
        x={target.x}
        y={target.y}
        {...layoutText(element.target.location, 'BOTTOM')}
      >
        {element.multiplicity.target}
      </text>
      <text
        x={source.x}
        y={source.y}
        {...layoutText(element.source.location, 'TOP')}
      >
        {element.role.source}
      </text>
      <text
        x={target.x}
        y={target.y}
        {...layoutText(element.target.location, 'TOP')}
      >
        {element.role.target}
      </text>
    </g>
  );
};

interface Props {
  element: ClassAssociation;
}

export default ClassAssociationComponent;
