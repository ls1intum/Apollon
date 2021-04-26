import React, { SFC } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLInterface } from './uml-interface';

export const UMLInterfaceComponent: SFC<Props> = ({ element }) => (
  <g>
    <circle cx="10px" cy="50%" r={10} stroke={element.color?.stroke || 'black'} strokeWidth={2} />
    <Text noY x="25px" dominantBaseline="auto" textAnchor="start" fill={element.color?.text}>
      {element.name}
    </Text>
  </g>
);

interface Props {
  element: UMLInterface;
}
