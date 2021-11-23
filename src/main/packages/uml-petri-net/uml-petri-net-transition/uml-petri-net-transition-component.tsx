import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLPetriNetTransition } from './uml-petri-net-transition';

export const UMLPetriNetTransitionComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <g>
    <Text y={-15 * scale} fill={element.textColor}>
      {element.name}
    </Text>
    <rect
      width={element.bounds.width}
      height={element.bounds.height}
      stroke={element.strokeColor || 'black'}
      strokeWidth={2 * scale}
      fillOpacity={1}
    />
  </g>
);

interface Props {
  element: UMLPetriNetTransition;
  scale: number;
}
