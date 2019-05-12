import React, { SFC } from 'react';
import { ComponentInterfaceRequired } from './component-interface-required';

export const ComponentInterfaceRequiredComponent: SFC<Props> = ({ element }) => (
  <g>
    <marker
      id={`marker-${element.id}`}
      viewBox="0 0 30 30"
      markerWidth="30"
      markerHeight="30"
      refX="0"
      refY="0"
      orient="auto"
      markerUnits="strokeWidth"
      strokeDasharray="1,0"
    >
      <path d="M 3 -15 a 24,24 0 0,0 0,30" fill="none" stroke="black" />
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
