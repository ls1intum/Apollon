import React, { SFC } from 'react';
import ActivityObjectNode from './ActivityObjectNode';

const ActivityObjectNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect width="100%" height="100%" stroke="black" />
    <text
      x="50%"
      y="50%"
      dominantBaseline="middle"
      textAnchor="middle"
      fontWeight="bold"
    >
      {element.name}
    </text>
  </g>
);

interface Props {
  element: ActivityObjectNode;
}

export default ActivityObjectNodeComponent;
