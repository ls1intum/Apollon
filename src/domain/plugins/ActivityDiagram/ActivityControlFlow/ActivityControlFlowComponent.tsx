import React, { SFC } from 'react';
import ActivityControlFlow from './ActivityControlFlow';

const ActivityControlFlowComponent: SFC<Props> = ({ element }) => (
  <g>
    <polyline
      points={element.path.map(point => `${point.x} ${point.y}`).join(',')}
      stroke="black"
      fill="none"
      strokeWidth={1}
    />
  </g>
);

interface Props {
  element: ActivityControlFlow;
}

export default ActivityControlFlowComponent;
