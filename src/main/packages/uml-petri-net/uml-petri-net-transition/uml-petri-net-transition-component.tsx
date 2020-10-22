import React, { SFC } from 'react';
import { UMLPetriNetTransition } from './uml-petri-net-transition';

export const UMLPetriNetTransitionComponent: SFC<Props> = ({ element }) => (
  <g>
    <text x="50%" y="-15" dominantBaseline="middle" textAnchor="middle" fontWeight="bold" pointerEvents="none">
      {element.name}
    </text>
    <rect
      width={element.bounds.width}
      height={element.bounds.height}
      stroke="black"
      strokeWidth={2}
      fillOpacity={1}
    />
  </g>
);

interface Props {
  element: UMLPetriNetTransition;
}
