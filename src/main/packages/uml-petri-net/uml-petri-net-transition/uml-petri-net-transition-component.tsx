import React, { SFC } from 'react';
import { UMLPetriNetTransition } from './uml-petri-net-transition';

export const UMLPetriNetTransitionComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect
      width={element.bounds.width}
      height={element.bounds.height}
      stroke="black"
      strokeWidth={2}
      fill="white"
      fillOpacity={1}
    />
  </g>
);

interface Props {
  element: UMLPetriNetTransition;
}
