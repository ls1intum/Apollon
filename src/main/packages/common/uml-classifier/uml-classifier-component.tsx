import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLClassifier } from './uml-classifier';

export const UMLClassifierComponent: FunctionComponent<Props> = ({ element, scale, children }) => {
  return (
    <g>
      <rect width="100%" height={element.stereotype ? 50 * scale : 40 * scale} />
      <rect
        y={element.stereotype ? 50 * scale : 40 * scale}
        width="100%"
        height={element.bounds.height - (element.stereotype ? 50 * scale : 40 * scale)}
      />
      {element.stereotype ? (
        <svg height={50 * scale}>
          <Text fill={element.textColor}>
            <tspan x="50%" dy={-8 * scale} textAnchor="middle" fontSize="85%">
              {`«${element.stereotype}»`}
            </tspan>
            <tspan
              x="50%"
              dy={18 * scale}
              textAnchor="middle"
              fontStyle={element.italic ? 'italic' : undefined}
              textDecoration={element.underline ? 'underline' : undefined}
            >
              {element.name}
            </tspan>
          </Text>
        </svg>
      ) : (
        <svg height={40 * scale}>
          <Text
            fill={element.textColor}
            fontStyle={element.italic ? 'italic' : undefined}
            textDecoration={element.underline ? 'underline' : undefined}
          >
            {element.name}
          </Text>
        </svg>
      )}
      {children}
      <rect width="100%" height="100%" stroke={element.strokeColor || 'black'} fill="none" pointerEvents="none" />
      <path d={`M 0 ${element.headerHeight} H ${element.bounds.width}`} stroke={element.strokeColor || 'black'} />
      <path d={`M 0 ${element.deviderPosition} H ${element.bounds.width}`} stroke={element.strokeColor || 'black'} />
    </g>
  );
};

interface Props {
  element: UMLClassifier;
  scale: number;
}
