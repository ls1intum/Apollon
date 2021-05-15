import React, { SFC } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLActivity } from './uml-activity';

export const UMLActivityComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <rect rx={10} ry={10} width="100%" height="100%" stroke={element.color?.stroke || 'black'} />
    <Text y="20%" fill={element.color?.text}>
      {element.name}
    </Text>
    {children}
  </g>
);

interface Props {
  element: UMLActivity;
}
