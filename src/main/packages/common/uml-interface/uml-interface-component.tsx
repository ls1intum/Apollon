import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLInterface } from './uml-interface';
import { ThemedCircle } from '../../../components/theme/themedComponents';

export const UMLInterfaceComponent: FunctionComponent<Props> = ({ element, fillColor }) => (
  <g>
    <ThemedCircle
      cx="50%"
      cy="50%"
      r={10}
      strokeColor={element.strokeColor}
      strokeWidth={2}
      fillColor={fillColor || element.fillColor}
    />
    <Text x={25} noY dominantBaseline="auto" textAnchor="start" fill={element.textColor}>
      {element.name}
    </Text>
  </g>
);

interface Props {
  element: UMLInterface;
  fillColor?: string;
}
