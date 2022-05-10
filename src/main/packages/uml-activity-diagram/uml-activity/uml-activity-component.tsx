import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLActivity } from './uml-activity';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const UMLActivityComponent: FunctionComponent<Props> = ({ element, children, scale }) => (
  <g>
    <ThemedRect rx={10 * scale} ry={10 * scale} width="100%" height="100%" strokeColor={element.strokeColor} />
    <Text y={20 * scale} fill={element.textColor}>
      {element.name}
    </Text>
    {children}
  </g>
);

interface Props {
  element: UMLActivity;
  scale: number;
}
