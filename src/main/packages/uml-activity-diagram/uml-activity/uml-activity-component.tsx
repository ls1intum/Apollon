import React, { SFC } from 'react';
import { UMLActivity } from './uml-activity';

export const UMLActivityComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <rect rx={10} ry={10} width="100%" height="100%" stroke={element.color?.stroke || 'black'} />
    <text x="50%" y="20" dominantBaseline="middle" textAnchor="middle" fontWeight="bold" pointerEvents="none">
      {element.name}
    </text>
    {children}
  </g>
);

interface Props {
  element: UMLActivity;
}
