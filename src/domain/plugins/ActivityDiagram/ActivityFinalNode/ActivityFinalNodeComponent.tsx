import React, { SFC } from 'react';
import ActivityFinalNode from './ActivityFinalNode';

const ActivityFinalNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <circle
      cx="50%"
      cy="50%"
      r={Math.min(element.bounds.width, element.bounds.height) / 2 - 2.5}
      stroke="black"
      strokeWidth="5"
    />
    <circle
      cx="50%"
      cy="50%"
      r={Math.min(element.bounds.width, element.bounds.height) / 2 - 7.5}
      stroke="none"
      fill="black"
    />
  </g>
);

interface Props {
  element: ActivityFinalNode;
}

export default ActivityFinalNodeComponent;
