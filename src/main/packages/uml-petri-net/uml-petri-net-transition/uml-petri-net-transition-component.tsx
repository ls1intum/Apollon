import React, { SFC } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLPetriNetTransition } from './uml-petri-net-transition';

export const UMLPetriNetTransitionComponent: SFC<Props> = ({ element }) => (
  <g>
    <Text y="-15" fill={element.textColor}>
      {element.name}
    </Text>
    <rect
      width={element.bounds.width}
      height={element.bounds.height}
      stroke={element.strokeColor || 'black'}
      strokeWidth={2}
      fillOpacity={1}
    />
  </g>
);

interface Props {
  element: UMLPetriNetTransition;
}
