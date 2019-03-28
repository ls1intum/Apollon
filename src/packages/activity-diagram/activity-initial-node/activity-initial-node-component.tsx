import React, { SFC } from 'react';
import {ActivityInitialNode} from './activity-initial-node';

export const ActivityInitialNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <circle
      cx="50%"
      cy="50%"
      r={Math.min(element.bounds.width, element.bounds.height) / 2}
      stroke="none"
      fill="black"
    />
  </g>
);

interface Props {
  element: ActivityInitialNode;
}
