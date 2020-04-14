import React, { SFC } from 'react';
import { UMLUseCaseSystem } from './uml-use-case-system';

export const UMLUseCaseSystemComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <rect width="100%" height="100%" stroke="black" />
    <text x="50%" y={16} textAnchor="middle" fontWeight="bold" pointerEvents="none">
      {element.name}
    </text>
    {children}
  </g>
);

interface Props {
  element: UMLUseCaseSystem;
}
