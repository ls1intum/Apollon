import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLState } from './uml-state';
import { ThemedRect, ThemedPath } from '../../../components/theme/themedComponents';

interface Props {
  element: UMLState;
  children?: React.ReactNode;
  fillColor?: string;
}

export const UMLStateComponent: FunctionComponent<Props> = ({ element, children, fillColor }) => {
  const cornerRadius = 8;

  return (
    <g>
      <ThemedRect
        fillColor={fillColor || element.fillColor}
        strokeColor="none"
        width="100%"
        height={element.stereotype ? 50 : 40}
        rx={cornerRadius}
      />
      <ThemedRect
        y={element.stereotype ? 50 : 40}
        width="100%"
        height={element.bounds.height - (element.stereotype ? 50 : 40)}
        strokeColor="none"
        rx={cornerRadius}
      />
      {element.stereotype ? (
        <svg height={50}>
          <Text fill={element.textColor}>
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
            fill={element.textColor}
            fontStyle={element.italic ? 'italic' : undefined}
            textDecoration={element.underline ? 'underline' : undefined}
          >
            {element.name}
          </Text>
        </svg>
      )}
      {children}
      <ThemedRect 
        width="100%" 
        height="100%" 
        strokeColor={element.strokeColor} 
        fillColor="none" 
        pointer-events="none"
        rx={cornerRadius}
      />
      {element.hasBody && (
        <ThemedPath d={`M 0 ${element.headerHeight} H ${element.bounds.width}`} strokeColor={element.strokeColor} />
      )}
      {element.hasFallbackBody && (
        <ThemedPath d={`M 0 ${element.deviderPosition} H ${element.bounds.width}`} strokeColor={element.strokeColor} />
      )}
    </g>
  );
}; 