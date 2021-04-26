import React, { SFC } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLUseCaseSystem } from './uml-use-case-system';

export const UMLUseCaseSystemComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <rect width="100%" height="100%" stroke={element.color?.stroke || 'black'} />
    <Text fill={element.color?.text} y={16}>
      {element.name}
    </Text>
    {children}
  </g>
);

interface Props {
  element: UMLUseCaseSystem;
}
