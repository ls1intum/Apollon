import React from 'react';
import { ThemedRect } from '../../../components/theme/themedComponents';
import { Text } from '../../../components/controls/text/text';
import { PrototypeRectangle } from './prototype-rectangle';

interface Props {
  element: PrototypeRectangle;
  fillColor?: string;
  children?: React.ReactNode;
}

export function PrototypeRectangleComponent({ element, children, fillColor }: Props) {
  return (
    <g>
      <ThemedRect
        fillColor={fillColor || element.fillColor}
        width="100%"
        height="100%"
      />
      <Text x={10} y={10} fill={element.textColor} textAnchor="start" dominantBaseline="hanging">
        {element.name}
      </Text>

      {children}

      <ThemedRect
        fillColor="none"
        width="100%"
        height="100%"
        strokeColor={element.strokeColor}
      />
    </g>
  );
}
