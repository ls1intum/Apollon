import React, { FunctionComponent } from 'react';
import { UMLReachabilityGraphMarking } from './uml-reachability-graph-marking';
import { Multiline } from '../../../utils/svg/multiline';
import { ThemedPath, ThemedPolyline, ThemedRect } from '../../../components/theme/themedComponents';
import { uuid } from '../../../utils/uuid';

export const UMLReachabilityGraphMarkingComponent: FunctionComponent<Props> = ({ element, fillColor }) => {
  const id = uuid();
  return (
    <g>
      <ThemedRect
        rx={10}
        ry={10}
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
        lineHeight={16}
        capHeight={11}
      >
        {element.name}
      </Multiline>
      {element.isInitialMarking && (
        <g>
          <marker
            id={`marker-${id}`}
            viewBox={`0 0 ${30} ${30}`}
            markerWidth={22}
            markerHeight={30}
            refX={30}
            refY={15}
            orient="auto"
            markerUnits="strokeWidth"
          >
            <ThemedPath d={`M0,${29} L${30},${15} L0,${1}`} fillColor="none" strokeColor={element.strokeColor} />
          </marker>
          <ThemedPolyline
            points={`-${50},-${50} ${3},${3}`}
            strokeColor={element.strokeColor}
            fillColor="none"
            strokeWidth={1}
            markerEnd={`url(#marker-${id})`}
          />
        </g>
      )}
    </g>
  );
};

interface Props {
  element: UMLReachabilityGraphMarking;
  fillColor?: string;
}
