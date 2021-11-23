import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLUseCase } from './uml-use-case';

export const UMLUseCaseComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <ellipse cx="50%" cy="50%" rx="50%" ry="50%" stroke={element.strokeColor || 'black'} />
    <Text fill={element.textColor}>{element.name}</Text>
  </g>
);

interface Props {
  element: UMLUseCase;
}
