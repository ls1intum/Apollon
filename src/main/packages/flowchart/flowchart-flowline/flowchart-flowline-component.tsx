import React, { FunctionComponent } from 'react';
import { Point } from '../../../utils/geometry/point';
import { FlowchartFlowline } from './flowchart-flowline';
import { ThemedPath, ThemedPolyline } from '../../../components/theme/themedComponents';
import { uuid } from '../../../utils/uuid';

export const FlowchartFlowlineComponent: FunctionComponent<Props> = ({ element }) => {
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
  const fill = element.textColor ? { fill: element.textColor } : {};

  const id = uuid();
  return (
    <g>
      <marker
        id={`marker-${id}`}
        viewBox="0 0 30 30"
        markerWidth="22"
        markerHeight="30"
        refX="30"
        refY="15"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <ThemedPath d="M0,29 L30,15 L0,1" fillColor="none" strokeColor={element.strokeColor} />
      </marker>
      <ThemedPolyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        strokeColor={element.strokeColor}
        fillColor="none"
        strokeWidth={1}
        markerEnd={`url(#marker-${id})`}
      />
      <text x={position.x} y={position.y} {...layoutText(direction)} pointerEvents="none" style={{ ...fill }}>
        {element.name}
      </text>
    </g>
  );
};

export interface Props {
  element: FlowchartFlowline;
}
