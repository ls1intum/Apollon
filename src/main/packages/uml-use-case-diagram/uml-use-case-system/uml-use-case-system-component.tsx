import React, { FunctionComponent, SFC } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLUseCaseSystem } from './uml-use-case-system';

export const UMLUseCaseSystemComponent: FunctionComponent<Props> = ({ element, children, scale }) => (
  <g>
    <rect width="100%" height="100%" stroke={element.strokeColor || 'black'} />
    <Text fill={element.textColor} y={16 * scale}>
      {element.name}
    </Text>
    {children}
  </g>
);

interface Props {
  element: UMLUseCaseSystem;
  scale: number;
}
