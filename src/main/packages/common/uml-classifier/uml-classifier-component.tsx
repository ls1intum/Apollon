import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLClassifier } from './uml-classifier';
import { ThemedPath, ThemedRect } from '../../../components/theme/themedComponents';

export const UMLClassifierComponent: FunctionComponent<Props> = ({ element, scale, children }) => {
  return (
    <g>
      <ThemedRect width="100%" height={element.stereotype ? 50 * scale : 40 * scale} />
      <ThemedRect
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
      <ThemedRect width="100%" height="100%" strokeColor={element.strokeColor} fillColor="none" pointerEvents="none" />
      <ThemedPath d={`M 0 ${element.headerHeight} H ${element.bounds.width}`} strokeColor={element.strokeColor} />
      <ThemedPath d={`M 0 ${element.deviderPosition} H ${element.bounds.width}`} strokeColor={element.strokeColor} />
    </g>
  );
};

interface Props {
  element: UMLClassifier;
  scale: number;
}
