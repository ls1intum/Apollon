import React, { SFC } from 'react';
import { UMLClassifierMember } from './uml-classifier-member';

export const UMLClassifierMemberComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect width="100%" height="100%" />
    <text x={10} y="50%" dominantBaseline="middle">
      {element.name}
    </text>
  </g>
);

interface Props {
  element: UMLClassifierMember;
}
