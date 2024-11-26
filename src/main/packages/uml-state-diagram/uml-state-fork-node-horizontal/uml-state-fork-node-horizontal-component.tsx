import React, { FunctionComponent } from 'react';
import { UMLStateForkNodeHorizontal } from './uml-state-fork-node-horizontal';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const UMLStateForkNodeHorizontalComponent: FunctionComponent<Props> = ({ element }) => (
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
  element: UMLStateForkNodeHorizontal;
} 