import React, { SFC } from 'react';
import { UMLClassPackage } from './uml-class-package';

export const UMLClassPackageComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <path d={`M 0 10 V 0 H 40 V 10`} stroke="black" />
    <rect y="10" width="100%" height={element.bounds.height - 10} stroke="black" />
    <text x="50%" y="20" dy={10} textAnchor="middle" fontWeight="bold" pointerEvents="none">
      {element.name}
    </text>
    {children}
  </g>
);

interface Props {
  element: UMLClassPackage;
}
