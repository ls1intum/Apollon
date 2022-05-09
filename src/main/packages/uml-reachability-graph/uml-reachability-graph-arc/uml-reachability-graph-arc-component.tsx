import React, { FunctionComponent } from 'react';
import { Point } from '../../../utils/geometry/point';
import { UMLReachabilityGraphArc } from './uml-reachability-graph-arc';
import { ThemedPath, ThemedPolyline } from '../../../components/theme/themedComponents';

export const UMLReachabilityGraphArcComponent: FunctionComponent<Props> = ({ element, scale }) => {
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
          dx: 5 * scale,
          dominantBaseline: 'middle',
          textAnchor: 'start',
        };
      case 'h':
        return {
          dy: -5 * scale,
          dominantBaseline: 'text-after-edge',
          textAnchor: 'middle',
        };
    }
  };

  const textColor = element.textColor ? { fill: element.textColor } : {};

  return (
    <g>
      <marker
        id={`marker-${element.id}`}
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
          strokeColor={element.strokeColor}
        />
      </marker>
      <ThemedPolyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        strokeColor={element.strokeColor}
        fillColor="none"
        strokeWidth={1 * scale}
        markerEnd={`url(#marker-${element.id})`}
      />
      <text x={position.x} y={position.y} {...layoutText(direction)} pointerEvents="none" style={{ ...textColor }}>
        {element.name}
      </text>
    </g>
  );
};

interface Props {
  element: UMLReachabilityGraphArc;
  scale: number;
}
