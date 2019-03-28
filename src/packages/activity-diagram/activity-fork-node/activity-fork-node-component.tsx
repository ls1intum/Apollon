import React, { SFC } from 'react';
import {ActivityForkNode} from './activity-fork-node';

export const ActivityForkNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect width="100%" height="100%" stroke="none" fill="black" />
  </g>
);

interface Props {
  element: ActivityForkNode;
}
