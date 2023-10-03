import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLActivity } from './uml-activity';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const UMLActivityComponent: FunctionComponent<Props> = ({ element, children, fillColor }) => (
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
  element: UMLActivity;
  fillColor?: string;
  children?: React.ReactNode;
}
