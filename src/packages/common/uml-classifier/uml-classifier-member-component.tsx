import React, { SFC } from 'react';
import { UMLClassifierMember } from './uml-classifier-member';

export const UMLClassifierMemberComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect x={1} y={1} width={element.bounds.width - 2} height={element.bounds.height - 2} />
    <text x={10} y="50%" dominantBaseline="middle">
      {element.name}
    </text>
  </g>
);

interface Props {
  element: UMLClassifierMember;
}
