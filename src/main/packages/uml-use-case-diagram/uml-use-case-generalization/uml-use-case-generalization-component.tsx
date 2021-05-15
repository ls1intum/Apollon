import React, { SFC } from 'react';
import { UMLUseCaseGeneralization } from './uml-use-case-generalization';

export const UMLUseCaseGeneralizationComponent: SFC<Props> = ({ element }) => (
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
      <path d="M0,1 L0,29 L30,15 z" fill="white" stroke={element.strokeColor || 'black'} />
    </marker>
    <polyline
      points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
      stroke={element.strokeColor || 'black'}
      fill="none"
      strokeWidth={1}
      markerEnd={`url(#marker-${element.id})`}
    />
  </g>
);

interface Props {
  element: UMLUseCaseGeneralization;
}
