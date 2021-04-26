import React, { SFC } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLUseCase } from './uml-use-case';

export const UMLUseCaseComponent: SFC<Props> = ({ element }) => (
  <g>
    <ellipse cx="50%" cy="50%" rx="50%" ry="50%" stroke={element.color?.stroke || 'black'} />
    <Text fill={element.color?.text}>{element.name}</Text>
  </g>
);

interface Props {
  element: UMLUseCase;
}
