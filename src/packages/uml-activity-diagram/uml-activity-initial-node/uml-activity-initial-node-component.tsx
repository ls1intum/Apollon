import React, { SFC } from 'react';
import { UMLActivityInitialNode } from './uml-activity-initial-node';

export const UMLActivityInitialNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <circle
      cx="50%"
      cy="50%"
      r={Math.min(element.bounds.width, element.bounds.height) / 2}
      stroke="none"
      fill="black"
      fillOpacity={1}
    />
  </g>
);

interface Props {
  element: UMLActivityInitialNode;
}
