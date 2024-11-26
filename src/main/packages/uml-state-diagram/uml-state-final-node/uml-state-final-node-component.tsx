import React, { FunctionComponent } from 'react';
import { UMLStateFinalNode } from './uml-state-final-node';
import { ThemedCircle } from '../../../components/theme/themedComponents';

export const UMLStateFinalNodeComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <ThemedCircle
      cx="50%"
      cy="50%"
      r="45%"
      strokeColor={element.strokeColor}
      fillColor={element.fillColor}
    />
    <ThemedCircle
      cx="50%"
      cy="50%"
      r="35%"
      strokeColor={element.strokeColor}
      fillColor={element.strokeColor}
    />
  </g>
);

interface Props {
  element: UMLStateFinalNode;
} 