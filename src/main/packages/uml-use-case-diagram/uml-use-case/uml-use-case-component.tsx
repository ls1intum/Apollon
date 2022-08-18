import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLUseCase } from './uml-use-case';
import { ThemedEllipse } from '../../../components/theme/themedComponents';

export const UMLUseCaseComponent: FunctionComponent<Props> = ({ element, fillColor }) => (
  <g>
    <ThemedEllipse
      cx="50%"
      cy="50%"
      rx="50%"
      ry="50%"
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
    />
    <Text fill={element.textColor}>{element.name}</Text>
  </g>
);

interface Props {
  element: UMLUseCase;
  fillColor?: string;
}
