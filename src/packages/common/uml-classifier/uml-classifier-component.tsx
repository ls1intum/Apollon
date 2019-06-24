import React, { SFC } from 'react';
import { ClassElementType } from '../../class-diagram';
import { UMLClassifier } from './uml-classifier';

export const UMLClassifierComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <rect width="100%" height="100%" />
    {element.stereotype ? (
      <svg height={50}>
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontWeight="bold">
          <tspan x="50%" dy={-8} textAnchor="middle" fontSize="85%">
            {`«${element.stereotype}»`}
          </tspan>
          <tspan
            x="50%"
            dy={18}
            textAnchor="middle"
            fontStyle={element.type === ClassElementType.AbstractClass ? 'italic' : 'normal'}
          >
            {element.name}
          </tspan>
        </text>
      </svg>
    ) : (
      <svg height={40}>
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontWeight="bold">
          {element.name}
        </text>
      </svg>
    )}
    {children}
    <rect width="100%" height="100%" stroke="black" fill="none" pointerEvents="none" />
    <path d={`M 0 ${element.headerHeight} H ${element.bounds.width}`} stroke="black" />
    <path d={`M 0 ${element.deviderPosition} H ${element.bounds.width}`} stroke="black" />
  </g>
);

interface Props {
  element: UMLClassifier;
}
