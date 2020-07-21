import React, { SFC } from 'react';
import { UMLActivityForkNode } from './uml-activity-fork-node';

export const UMLActivityForkNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect width="100%" height="100%" stroke="none" fill="black" />
  </g>
);

interface Props {
  element: UMLActivityForkNode;
}
