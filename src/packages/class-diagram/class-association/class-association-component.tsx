import React, { SFC } from 'react';
import { ClassRelationshipType } from '..';
import { Direction, IUMLElementPort } from '../../../services/uml-element/uml-element-port';
import { Point } from '../../../utils/geometry/point';
import { ClassAssociation } from './class-association';

const Marker = {
  Arrow: (id: string) => (
    <marker
      id={id}
      viewBox="0 0 30 30"
      markerWidth="22"
      markerHeight="30"
      refX="30"
      refY="15"
      orient="auto"
      markerUnits="strokeWidth"
      strokeDasharray="1,0"
    >
      <path d="M0,29 L30,15 L0,1" fill="none" stroke="black" />
    </marker>
  ),
  Rhombus: (id: string) => (
    <marker
      id={id}
      viewBox="0 0 30 30"
      markerWidth="30"
      markerHeight="30"
      refX="30"
      refY="15"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <path d="M0,15 L15,22 L30,15 L15,8 z" fill="white" stroke="black" />
    </marker>
  ),
  RhombusFilled: (id: string) => (
    <marker
      id={id}
      viewBox="0 0 30 30"
      markerWidth="30"
      markerHeight="30"
      refX="30"
      refY="15"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <path d="M0,15 L15,22 L30,15 L15,8 z" fill="black" />
    </marker>
  ),
  Triangle: (id: string) => (
    <marker
      id={id}
      viewBox="0 0 30 30"
      markerWidth="22"
      markerHeight="30"
      refX="30"
      refY="15"
      orient="auto"
      markerUnits="strokeWidth"
      strokeDasharray="1,0"
    >
      <path d="M0,1 L0,29 L30,15 z" fill="white" stroke="black" />
    </marker>
  ),
};

export const ClassAssociationComponent: SFC<Props> = ({ element }) => {
  const marker = (type => {
    switch (type) {
      case ClassRelationshipType.ClassDependency:
      case ClassRelationshipType.ClassUnidirectional:
        return Marker.Arrow;
      case ClassRelationshipType.ClassAggregation:
        return Marker.Rhombus;
      case ClassRelationshipType.ClassComposition:
        return Marker.RhombusFilled;
      case ClassRelationshipType.ClassInheritance:
      case ClassRelationshipType.ClassRealization:
        return Marker.Triangle;
    }
  })(element.type);

  const stroke = (type => {
    switch (type) {
      case ClassRelationshipType.ClassDependency:
      case ClassRelationshipType.ClassRealization:
        return 7;
    }
  })(element.type);

  const computeTextPosition = (alignmentPath: Point[], hasMarker: boolean = false): Point => {
    const distance = hasMarker ? 31 : 8;
    const vector = alignmentPath[1].subtract(alignmentPath[0]);
    return alignmentPath[0].add(vector.normalize().scale(distance));
  };

  const layoutText = (location: IUMLElementPort['direction'], position: 'TOP' | 'BOTTOM') => {
    switch (location) {
      case Direction.Up:
        return {
          dx: position === 'TOP' ? -5 : 5,
          textAnchor: position === 'TOP' ? 'end' : 'start',
        };
      case Direction.Right:
        return {
          dy: position === 'TOP' ? -10 : 21,
          textAnchor: 'start',
        };
      case Direction.Down:
        return {
          dx: position === 'TOP' ? -5 : 5,
          dy: 10,
          textAnchor: position === 'TOP' ? 'end' : 'start',
        };
      case Direction.Left:
        return {
          dy: position === 'TOP' ? -10 : 21,
          textAnchor: 'end',
        };
    }
  };

  const path = element.path.map(point => new Point(point.x, point.y));
  const source: Point = computeTextPosition(path);
  const target: Point = computeTextPosition(path.reverse(), !!marker);
  const id = `marker-${element.id}`;

  return (
    <g>
      {marker && marker(id)}
      <polyline
        points={element.path.map(point => `${point.x} ${point.y}`).join(',')}
        stroke="black"
        fill="none"
        strokeWidth={1}
        markerEnd={`url(#${id})`}
        strokeDasharray={stroke}
      />
      {element.source && (
        <text x={source.x} y={source.y} {...layoutText(element.source.direction, 'BOTTOM')}>
          {element.multiplicity.source}
        </text>
      )}
      {element.target && (
        <text x={target.x} y={target.y} {...layoutText(element.target.direction, 'BOTTOM')}>
          {element.multiplicity.target}
        </text>
      )}
      {element.source && (
        <text x={source.x} y={source.y} {...layoutText(element.source.direction, 'TOP')}>
          {element.role.source}
        </text>
      )}
      {element.target && (
        <text x={target.x} y={target.y} {...layoutText(element.target.direction, 'TOP')}>
          {element.role.target}
        </text>
      )}
    </g>
  );
};

interface Props {
  element: ClassAssociation;
}
