import React, { FunctionComponent, SFC } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLActivity } from './uml-activity';

export const UMLActivityComponent: FunctionComponent<Props> = ({ element, children, scale }) => (
  <g>
    <rect rx={10 * scale} ry={10 * scale} width="100%" height="100%" stroke={element.strokeColor || 'black'} />
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
