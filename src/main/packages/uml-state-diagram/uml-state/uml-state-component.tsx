import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLState } from './uml-state';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const UMLStateComponent: FunctionComponent<Props> = ({ element, children, fillColor }) => (
  <g>
    <ThemedRect
      rx={10}
      ry={10}
      width="100%"
      height="100%"
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
    />
    <Text y={20} fill={element.textColor}>
      {element.name}
    </Text>
    {children}
  </g>
);

interface Props {
  element: UMLState;
  fillColor?: string;
  children?: React.ReactNode;
} 