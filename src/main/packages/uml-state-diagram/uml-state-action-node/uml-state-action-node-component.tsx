import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLStateActionNode } from './uml-state-action-node';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const UMLStateActionNodeComponent: FunctionComponent<Props> = ({ element, children, fillColor }) => (
  <g>
    <ThemedRect
      rx={5}
      ry={5}
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
  element: UMLStateActionNode;
  fillColor?: string;
  children?: React.ReactNode;
} 