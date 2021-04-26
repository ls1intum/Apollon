import React, { SFC } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLClassifier } from './uml-classifier';

export const UMLClassifierComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <rect width="100%" height={element.stereotype ? 50 : 40} />
    <rect
      y={element.stereotype ? 50 : 40}
      width="100%"
      height={element.bounds.height - (element.stereotype ? 50 : 40)}
      fill="white"
    />
    {element.stereotype ? (
      <svg height={50}>
        <Text fill={element.color?.text}>
          <tspan x="50%" dy={-8} textAnchor="middle" fontSize="85%">
            {`«${element.stereotype}»`}
          </tspan>
          <tspan
            x="50%"
            dy={18}
            textAnchor="middle"
            fontStyle={element.italic ? 'italic' : undefined}
            textDecoration={element.underline ? 'underline' : undefined}
          >
            {element.name}
          </tspan>
        </Text>
      </svg>
    ) : (
      <svg height={40}>
        <Text
          fill={element.color?.text}
          fontStyle={element.italic ? 'italic' : undefined}
          textDecoration={element.underline ? 'underline' : undefined}
        >
          {element.name}
        </Text>
      </svg>
    )}
    {children}
    <rect width="100%" height="100%" stroke={element.color?.stroke || 'black'} fill="none" pointerEvents="none" />
    <path d={`M 0 ${element.headerHeight} H ${element.bounds.width}`} stroke={element.color?.stroke || 'black'} />
    <path d={`M 0 ${element.deviderPosition} H ${element.bounds.width}`} stroke={element.color?.stroke || 'black'} />
  </g>
);

interface Props {
  element: UMLClassifier;
}
