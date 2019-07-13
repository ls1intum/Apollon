import React, { SFC } from 'react';
import { UMLDeploymentNode } from './uml-deployment-node';

export const UMLDeploymentNodeComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <g>
      <path d={`M 0 8 l 8 -8 H ${element.bounds.width} l -8 8 Z`} stroke="black" />
      <path d={`M ${element.bounds.width} 0 V ${element.bounds.height - 8} l -8 8 V 8 Z`} stroke="black" />
      <rect x="0" y="8" width={element.bounds.width - 8} height={element.bounds.height - 9} stroke="black" />
    </g>
    <text x="50%" y="30" dominantBaseline="middle" textAnchor="middle" fontWeight="bold">
      <tspan x="50%" dy={-8} textAnchor="middle" fontSize="85%">
        {`«${element.stereotype}»`}
      </tspan>
      <tspan x="50%" dy={18} textAnchor="middle">
        {element.name}
      </tspan>
    </text>
    {children}
  </g>
);

interface Props {
  element: UMLDeploymentNode;
}
