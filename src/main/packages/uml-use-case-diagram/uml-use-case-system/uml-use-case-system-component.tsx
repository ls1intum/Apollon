import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLUseCaseSystem } from './uml-use-case-system';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const UMLUseCaseSystemComponent: FunctionComponent<Props> = ({ element, children, scale }) => (
  <g>
    <ThemedRect width="100%" height="100%" strokeColor={element.strokeColor} />
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
