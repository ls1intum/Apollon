import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { Point } from '../../../utils/geometry/point';
import { UMLDeploymentAssociation } from './uml-deployment-association';
import { ThemedPolyline } from '../../../components/theme/themedComponents';

export const UMLDeploymentAssociationComponent: FunctionComponent<Props> = ({ element }) => {
  let position = { x: 0, y: 0 };
  let direction: 'v' | 'h' = 'v';
  const path = element.path.map((point) => new Point(point.x, point.y));
  let distance =
    path.reduce(
      (length, point, i, points) => (i + 1 < points.length ? length + points[i + 1].subtract(point).length : length),
      0,
    ) / 2;

  for (let index = 0; index < path.length - 1; index++) {
    const vector = path[index + 1].subtract(path[index]);
    if (vector.length > distance) {
      const norm = vector.normalize();
      direction = Math.abs(norm.x) > Math.abs(norm.y) ? 'h' : 'v';
      position = path[index].add(norm.scale(distance));
      break;
    }
    distance -= vector.length;
  }
  const layoutText = (dir: 'v' | 'h') => {
    switch (dir) {
      case 'v':
        return {
          dx: 5,
          dominantBaseline: 'middle',
          textAnchor: 'start',
        };
      case 'h':
        return {
          dy: -5,
          dominantBaseline: 'text-after-edge',
          textAnchor: 'middle',
        };
    }
  };

  return (
    <g>
      <ThemedPolyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        strokeColor={element.strokeColor}
        fillColor="none"
        strokeWidth={1}
      />
      <Text fill={element.textColor} x={position.x} y={position.y} {...layoutText(direction)} pointerEvents="none">
        {element.name}
      </Text>
    </g>
  );
};

interface Props {
  element: UMLDeploymentAssociation;
}
