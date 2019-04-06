import React, { SFC } from 'react';
import { Port } from '../../../services/element/port';
import { Direction } from '../../../typings';
import { ActivityControlFlow } from './activity-control-flow';

export const ActivityControlFlowComponent: SFC<Props> = ({ element }) => {
  const layoutText = (location: Port['direction']) => {
    switch (location) {
      case Direction.Up:
        return {
          dx: -5,
          dominantBaseline: 'text-after-edge',
          textAnchor: 'end',
        };
      case Direction.Right:
        return {
          dy: -10,
          dominantBaseline: 'text-after-edge',
          textAnchor: 'start',
        };
      case Direction.Down:
        return {
          dx: -5,
          dominantBaseline: 'text-before-edge',
          textAnchor: 'end',
        };
      case Direction.Left:
        return {
          dy: -10,
          dominantBaseline: 'text-after-edge',
          textAnchor: 'end',
        };
    }
  };

  const source = { ...element.path[0] };

  return (
    <g>
      <marker
        id={`marker-${element.id}`}
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
      <polyline
        points={element.path.map(point => `${point.x} ${point.y}`).join(',')}
        stroke="black"
        fill="none"
        strokeWidth={1}
        markerEnd={`url(#marker-${element.id})`}
      />
      <text x={source.x} y={source.y} {...layoutText(element.source.direction)}>
        {element.name}
      </text>
    </g>
  );
};

interface Props {
  element: ActivityControlFlow;
}
