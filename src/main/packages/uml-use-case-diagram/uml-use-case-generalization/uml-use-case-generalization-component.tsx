import React, { FunctionComponent } from 'react';
import { UMLUseCaseGeneralization } from './uml-use-case-generalization';
import { ThemedPath, ThemedPolyline } from '../../../components/theme/themedComponents';
import { uuid } from '../../../utils/uuid';

export const UMLUseCaseGeneralizationComponent: FunctionComponent<Props> = ({ element }) => {
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
        <ThemedPath d="M0,1 L0,29 L30,15 z" strokeColor={element.strokeColor} />
      </marker>
      <ThemedPolyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        strokeColor={element.strokeColor}
        fillColor="none"
        strokeWidth={1}
        markerEnd={`url(#marker-${id})`}
      />
    </g>
  );
};

interface Props {
  element: UMLUseCaseGeneralization;
}
