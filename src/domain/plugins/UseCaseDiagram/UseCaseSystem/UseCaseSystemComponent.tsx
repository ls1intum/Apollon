import React, { SFC } from 'react';
import UseCaseSystem from './UseCaseSystem';

const UseCaseSystemComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <rect width="100%" height="100%" stroke="black" />
    <text x="50%" y={16} textAnchor="middle" fontWeight="bold">
      {element.name}
    </text>
    {children}
  </g>
);

interface Props {
  element: UseCaseSystem;
}

export default UseCaseSystemComponent;
