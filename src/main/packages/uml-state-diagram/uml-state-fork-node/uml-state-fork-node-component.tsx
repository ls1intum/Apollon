import React, { FunctionComponent } from 'react';
import { UMLStateForkNode } from './uml-state-fork-node';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const UMLStateForkNodeComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <ThemedRect
      width="100%"
      height="100%"
      strokeColor={element.strokeColor}
      fillColor={element.strokeColor}
    />
  </g>
);

interface Props {
  element: UMLStateForkNode;
} 