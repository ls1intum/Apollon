import React, { FunctionComponent } from 'react';
import { Direction, IUMLElementPort } from '../../../services/uml-element/uml-element-port';
import { Point } from '../../../utils/geometry/point';
import { ClassRelationshipType } from '../../uml-class-diagram';
import { UMLAssociation } from './uml-association';
import { UMLRelationshipType } from '../../uml-relationship-type';
import { ThemedPath, ThemedPathContrast, ThemedPolyline } from '../../../components/theme/themedComponents';

const Marker = {
  Arrow: (id: string, color?: string, scale: number = 1.0) => (
    <marker
      id={id}
      viewBox={`0 0 ${30 * scale} ${30 * scale}`}
      markerWidth={22 * scale}
      markerHeight={30 * scale}
      refX={30 * scale}
      refY={15 * scale}
      orient="auto"
      markerUnits="strokeWidth"
    >
      <ThemedPath
        d={`M0,${29 * scale} L${30 * scale},${15 * scale} L0,${1 * scale}`}
        fillColor="none"
        strokeColor={color}
      />
    </marker>
  ),
  Rhombus: (id: string, color?: string, scale: number = 1.0) => (
    <marker
      id={id}
      style={{ transform: `scale(${scale})` }}
      viewBox="0 0 30 30"
      markerWidth="30"
      markerHeight="30"
      refX="30"
      refY="15"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <ThemedPath d="M0,15 L15,22 L30,15 L15,8 z" fillColor={color} strokeColor={color} />
    </marker>
  ),
  RhombusFilled: (id: string, color?: string, scale: number = 1.0) => (
    <marker
      id={id}
      style={{ transform: `scale(${scale})` }}
      viewBox="0 0 30 30"
      markerWidth="30"
      markerHeight="30"
      refX="30"
      refY="15"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <ThemedPathContrast d="M0,15 L15,22 L30,15 L15,8 z" fillColor={color} />
    </marker>
  ),
  Triangle: (id: string, color?: string, scale: number = 1.0) => (
    <marker
      id={id}
      style={{ transform: `scale(${scale})` }}
      viewBox="0 0 30 30"
      markerWidth="22"
      markerHeight="30"
      refX="30"
      refY="15"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <ThemedPath d="M0,1 L0,29 L30,15 z" strokeColor={color} />
    </marker>
  ),
};

export const layoutTextForUMLAssociation = (location: IUMLElementPort['direction'], position: 'TOP' | 'BOTTOM') => {
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

export const computeTextPositionForUMLAssociation = (alignmentPath: Point[], hasMarker: boolean = false): Point => {
  const distance = hasMarker ? 31 : 8;
  if (alignmentPath.length < 2) return new Point();
  const vector = alignmentPath[1].subtract(alignmentPath[0]);
  return alignmentPath[0].add(vector.normalize().scale(distance));
};

export const getMarkerForTypeForUMLAssociation = (relationshipType: UMLRelationshipType) => {
  return ((type) => {
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
  })(relationshipType);
};

export const UMLAssociationComponent: FunctionComponent<Props> = ({ element, scale }) => {
  const marker = getMarkerForTypeForUMLAssociation(element.type);

  const stroke = ((type) => {
    switch (type) {
      case ClassRelationshipType.ClassDependency:
      case ClassRelationshipType.ClassRealization:
        return 7;
    }
  })(element.type);

  const path = element.path.map((point) => new Point(point.x, point.y));
  const source: Point = computeTextPositionForUMLAssociation(path);
  const target: Point = computeTextPositionForUMLAssociation(path.reverse(), !!marker);
  const id = `marker-${element.id}`;

  const textFill = element.textColor ? { fill: element.textColor } : {};
  return (
    <g>
      {marker && marker(id, element.strokeColor, scale)}
      <ThemedPolyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        strokeColor={element.strokeColor}
        fillColor="none"
        strokeWidth={1}
        markerEnd={`url(#${id})`}
        strokeDasharray={stroke}
      />
      <text
        x={source.x}
        y={source.y}
        {...layoutTextForUMLAssociation(element.source.direction, 'BOTTOM')}
        pointerEvents="none"
        style={{ ...textFill }}
      >
        {element.source.multiplicity}
      </text>
      <text
        x={target.x}
        y={target.y}
        {...layoutTextForUMLAssociation(element.target.direction, 'BOTTOM')}
        pointerEvents="none"
        style={{ ...textFill }}
      >
        {element.target.multiplicity}
      </text>
      <text
        x={source.x}
        y={source.y}
        {...layoutTextForUMLAssociation(element.source.direction, 'TOP')}
        pointerEvents="none"
        style={{ ...textFill }}
      >
        {element.source.role}
      </text>
      <text
        x={target.x}
        y={target.y}
        {...layoutTextForUMLAssociation(element.target.direction, 'TOP')}
        pointerEvents="none"
        style={{ ...textFill }}
      >
        {element.target.role}
      </text>
    </g>
  );
};

interface Props {
  element: UMLAssociation;
  scale: number;
}
