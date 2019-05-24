import React, { SFC } from 'react';
import { ComponentInterfaceRequired } from './component-interface-required';

const SIZE = 26;

export const ComponentInterfaceRequiredComponent: SFC<Props> = ({ element }) => (
  <g>
    <marker
      id={`marker-${element.id}`}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      markerWidth={SIZE}
      markerHeight={SIZE}
      refX="0"
      refY="0"
      orient="auto"
      markerUnits="strokeWidth"
      strokeDasharray="1,0"
    >
      <path d={`M ${SIZE / 2 - 3} -${SIZE / 2} a 1,1 0 0,0 0,${SIZE}`} fill="none" stroke="black" strokeWidth={2} />
    </marker>
    <polyline
      points={element.path.map(point => `${point.x} ${point.y}`).join(',')}
      stroke="black"
      fill="none"
      strokeWidth={1}
      markerEnd={`url(#marker-${element.id})`}
    />
  </g>
);

interface Props {
  element: ComponentInterfaceRequired;
}
