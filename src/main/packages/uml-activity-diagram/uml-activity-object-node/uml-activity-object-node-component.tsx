import React, { SFC } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { UMLActivityObjectNode } from './uml-activity-object-node';

export const UMLActivityObjectNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect width="100%" height="100%" stroke={element.color?.stroke || 'black'} />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height / 2}
      width={element.bounds.width}
      height={element.bounds.height}
      fontWeight="bold"
      fill={element.color?.text}
    >
      {element.name}
    </Multiline>
  </g>
);

interface Props {
  element: UMLActivityObjectNode;
}
