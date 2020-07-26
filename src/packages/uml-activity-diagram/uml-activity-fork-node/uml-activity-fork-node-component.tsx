import React, { SFC } from 'react';
import { UMLActivityForkNode } from './uml-activity-fork-node';

export const UMLActivityForkNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect
      width={element.bounds.width}
      height={element.bounds.height}
      stroke="none"
      fill="black"
      fillOpacity={1}
    />
  </g>
);

interface Props {
  element: UMLActivityForkNode;
}
