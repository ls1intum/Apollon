import React, { FunctionComponent } from 'react';
import { UMLDependency } from './uml-component-dependency.js';

export const UMLDependencyComponent: FunctionComponent<Props> = ({ element }) => (
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
    >
      <path d="M0,29 L30,15 L0,1" fill="none" stroke={element.strokeColor || 'black'} />
    </marker>
    <polyline
      points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
      stroke={element.strokeColor || 'black'}
      fill="none"
      strokeWidth={1}
      strokeDasharray={7}
      markerEnd={`url(#marker-${element.id})`}
    />
  </g>
);

interface Props {
  element: UMLDependency;
}
