import React, { FunctionComponent } from 'react';
import { UMLReachabilityGraphMarking } from './uml-reachability-graph-marking';
import { Multiline } from '../../../utils/svg/multiline';
import { ThemedRect, ThemedPath, ThemedPolyline } from '../../../components/theme/themedComponents';

export const UMLReachabilityGraphMarkingComponent: FunctionComponent<Props> = ({ element, scale, fillColor }) => (
  <g>
    <ThemedRect
      rx={10 * scale}
      ry={10 * scale}
      width="100%"
      height="100%"
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
    />
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
          <ThemedPath
            d={`M0,${29 * scale} L${30 * scale},${15 * scale} L0,${1 * scale}`}
            fillColor="none"
            strokeColor={element.strokeColor}
          />
        </marker>
        <ThemedPolyline
          points={`-${50 * scale},-${50 * scale} ${3 * scale},${3 * scale}`}
          strokeColor={element.strokeColor}
          fillColor="none"
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
  fillColor?: string;
}
