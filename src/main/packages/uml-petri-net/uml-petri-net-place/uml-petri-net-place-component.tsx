import React, { SFC } from 'react';
import { UMLPetriNetPlace } from './uml-petri-net-place';

export const UMLPetriNetPlaceComponent: SFC<Props> = ({ element }) => (
  <g>
    <circle
      cx="50%"
      cy="50%"
      r={Math.min(element.bounds.width, element.bounds.height) / 2}
      stroke="black"
      strokeWidth={2}
      fill="white"
      fillOpacity={1}
    />
  </g>
);

interface Props {
  element: UMLPetriNetPlace;
}
