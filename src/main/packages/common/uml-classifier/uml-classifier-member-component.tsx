import React, { SFC } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLClassifierMember } from './uml-classifier-member';

export const UMLClassifierMemberComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect width="100%" height="100%" />
    <Text x={10} fill={element.textColor} fontWeight="normal" textAnchor="start">
      {element.name}
    </Text>
  </g>
);

interface Props {
  element: UMLClassifierMember;
}
