import React, { SFC } from 'react';
import { Activity } from './activity';

export const ActivityComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <rect rx={10} ry={10} width="100%" height="100%" stroke="black" />
    <text x="50%" y="20" dominantBaseline="middle" textAnchor="middle" fontWeight="bold">
      {element.name}
    </text>
    {children}
  </g>
);

interface Props {
  element: Activity;
}