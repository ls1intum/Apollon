import React, { SFC } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLInterface } from './uml-interface';

export const UMLInterfaceComponent: SFC<Props> = ({ element }) => (
  <g>
    <circle cx="10px" cy="50%" r={10} stroke={element.strokeColor || 'black'} strokeWidth={2} />
    <Text noY x="25px" dominantBaseline="auto" textAnchor="start" fill={element.textColor}>
      {element.name}
    </Text>
  </g>
);

interface Props {
  element: UMLInterface;
}
