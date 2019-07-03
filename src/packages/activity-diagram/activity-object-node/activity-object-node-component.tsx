import React, { SFC } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { ActivityObjectNode } from './activity-object-node';

export const ActivityObjectNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect width="100%" height="100%" stroke="black" />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height / 2}
      width={element.bounds.width}
      height={element.bounds.height}
      fontWeight="bold"
    >
      {element.name}
    </Multiline>
  </g>
);

interface Props {
  element: ActivityObjectNode;
}
