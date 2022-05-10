import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLInterface } from './uml-interface';
import { ThemedCircle } from '../../../components/theme/themedComponents';

export const UMLInterfaceComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <g>
    <ThemedCircle
      cx={`${10 * scale}px`}
      cy="50%"
      r={10 * scale}
      strokeColor={element.strokeColor}
      strokeWidth={2 * scale}
    />
    <Text noY x={`${25 * scale}px`} dominantBaseline="auto" textAnchor="start" fill={element.textColor}>
      {element.name}
    </Text>
  </g>
);

interface Props {
  element: UMLInterface;
  scale: number;
}
