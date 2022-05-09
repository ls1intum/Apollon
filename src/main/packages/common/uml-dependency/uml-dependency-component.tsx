import React, { FunctionComponent } from 'react';
import { UMLDependency } from './uml-component-dependency';
import { ThemedPath, ThemedPolyline } from '../../../components/theme/themedComponents';

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
      <ThemedPath d="M0,29 L30,15 L0,1" fillColor="none" strokeColor={element.strokeColor} />
    </marker>
    <ThemedPolyline
      points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
      strokeColor={element.strokeColor}
      fillColor="none"
      strokeWidth={1}
      strokeDasharray={7}
      markerEnd={`url(#marker-${element.id})`}
    />
  </g>
);

interface Props {
  element: UMLDependency;
}
