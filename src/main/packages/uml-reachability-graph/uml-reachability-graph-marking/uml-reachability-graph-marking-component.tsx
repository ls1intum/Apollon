import React, { SFC } from 'react';
import { UMLReachabilityGraphMarking } from './uml-reachability-graph-marking';
import { Multiline } from '../../../utils/svg/multiline';

export const UMLReachabilityGraphMarkingComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect rx={10} ry={10} width="100%" height="100%" stroke={element.strokeColor || 'black'} />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height / 2}
      width={element.bounds.width}
      height={element.bounds.height}
      fontWeight="bold"
      fill={element.textColor}
    >
      {element.name}
    </Multiline>
    {element.isInitialMarking && (
      <g>
        <marker
          id={`marker-${element.id}`}
          viewBox="0 0 30 30"
          markerWidth="22"
          markerHeight="30"
          refX="30"
          refY="15"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,29 L30,15 L0,1" fill="none" stroke={element.strokeColor || 'black'} />
        </marker>
        <polyline
          points="-50,-50 3,3"
          stroke={element.strokeColor || 'black'}
          fill="none"
          strokeWidth={1}
          markerEnd={`url(#marker-${element.id})`}
        />
      </g>
    )}
  </g>
);

interface Props {
  element: UMLReachabilityGraphMarking;
}
