import React, { FunctionComponent, SVGProps } from 'react';
import { Point } from '../../../utils/geometry/point';
import { BPMNFlow } from './bpmn-flow';
import { ThemedCircle, ThemedPath, ThemedPolyline } from '../../../components/theme/themedComponents';

export const BPMNFlowComponent: FunctionComponent<Props> = ({ element }) => {
  let position = { x: 0, y: 0 };
  let direction: 'vertical' | 'horizontal' = 'vertical';
  const path = element.path.map((point) => new Point(point.x, point.y));
  let distance =
    path.reduce(
      (length, point, i, points) => (i + 1 < points.length ? length + points[i + 1].subtract(point).length : length),
      0,
    ) / 2;

  for (let index = 0; index < path.length - 1; index++) {
    const vector = path[index + 1].subtract(path[index]);
    if (vector.length > distance) {
      const normalized = vector.normalize();
      direction = Math.abs(normalized.x) > Math.abs(normalized.y) ? 'horizontal' : 'vertical';
      position = path[index].add(normalized.scale(distance));
      break;
    }
    distance -= vector.length;
  }

  /**
   * Layout the flow's label according to its direction
   * @param direction The direction according to which the label should be layouted
   */
  const layoutText = (direction: 'vertical' | 'horizontal'): SVGProps<SVGTextElement> => {
    switch (direction) {
      case 'vertical':
        return {
          dx: 5,
          dominantBaseline: 'middle',
          textAnchor: 'start',
        };
      case 'horizontal':
        return {
          dy: -5,
          dominantBaseline: 'text-after-edge',
          textAnchor: 'middle',
        };
    }
  };

  return (
    <g>
      {element.flowType === 'message' && (
        <marker
          id={`marker-start-${element.id}`}
          viewBox={`0 0 ${10} ${10}`}
          markerWidth={10}
          markerHeight={10}
          refX={0}
          refY={0}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <ThemedCircle cx="0%" cy="0%" r={5} strokeColor={element.fillColor} strokeWidth={1} />
        </marker>
      )}
      {(element.flowType === 'sequence' || element.flowType === 'message') && (
        <marker
          id={`marker-end-${element.id}`}
          viewBox={`0 0 ${10} ${5}`}
          markerWidth={10}
          markerHeight={10}
          refX={11}
          refY={5}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <ThemedPath
            d={`M0,0 L10,5 L0,10, L0,0 z`}
            fillRule="evenodd"
            fillColor="strokeColor"
            strokeLinejoin="round"
          />
        </marker>
      )}
      {element.flowType === 'data association' && (
        <marker
          id={`marker-end-${element.id}`}
          viewBox={`0 0 ${10} ${5}`}
          markerWidth={10}
          markerHeight={10}
          refX={11}
          refY={5}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <ThemedPath
            d={`M5,0 L10,5 L5,10`}
            fillRule="evenodd"
            strokeLinejoin="round"
            strokeLinecap="round"
            fillColor="transparent"
          />
        </marker>
      )}
      <ThemedPolyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        strokeColor={element.strokeColor}
        fillColor="none"
        strokeWidth={1}
        markerStart={element.flowType === 'message' ? `url(#marker-start-${element.id})` : undefined}
        markerEnd={element.flowType !== 'association' ? `url(#marker-end-${element.id})` : undefined}
        strokeDasharray={element.flowType !== 'sequence' ? 4 : undefined}
      />
      <text
        x={position.x}
        y={position.y}
        {...layoutText(direction)}
        pointerEvents="none"
        style={{ fill: element.textColor }}
      >
        {element.name}
      </text>
    </g>
  );
};

interface Props {
  element: BPMNFlow;
}
