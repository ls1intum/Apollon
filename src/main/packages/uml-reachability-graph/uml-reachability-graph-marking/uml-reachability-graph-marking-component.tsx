import React, { FunctionComponent } from 'react';
import { UMLReachabilityGraphMarking } from './uml-reachability-graph-marking.js';
import { Multiline } from '../../../utils/svg/multiline.js';

export const UMLReachabilityGraphMarkingComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <g>
    <rect rx={10 * scale} ry={10 * scale} width="100%" height="100%" stroke={element.strokeColor || 'black'} />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height / 2}
      width={element.bounds.width}
      height={element.bounds.height}
      fontWeight="bold"
      fill={element.textColor}
      lineHeight={16 * scale}
      capHeight={11 * scale}
    >
      {element.name}
    </Multiline>
    {element.isInitialMarking && (
      <g>
        <marker
          id={`marker-${element.id}`}
          viewBox={`0 0 ${30 * scale} ${30 * scale}`}
          markerWidth={22 * scale}
          markerHeight={30 * scale}
          refX={30 * scale}
          refY={15 * scale}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d={`M0,${29 * scale} L${30 * scale},${15 * scale} L0,${1 * scale}`}
            fill="none"
            stroke={element.strokeColor || 'black'}
          />
        </marker>
        <polyline
          points={`-${50 * scale},-${50 * scale} ${3 * scale},${3 * scale}`}
          stroke={element.strokeColor || 'black'}
          fill="none"
          strokeWidth={1 * scale}
          markerEnd={`url(#marker-${element.id})`}
        />
      </g>
    )}
  </g>
);

interface Props {
  element: UMLReachabilityGraphMarking;
  scale: number;
}
