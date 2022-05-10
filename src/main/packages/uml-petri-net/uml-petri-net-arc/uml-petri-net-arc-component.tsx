import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { Point } from '../../../utils/geometry/point';
import { UMLPetriNetArc } from './uml-petri-net-arc';
import { ThemedPathContrast, ThemedPolyline } from '../../../components/theme/themedComponents';

export const UMLPetriNetArcComponent: FunctionComponent<Props> = ({ element }) => {
  const [start, end] = element.path.map((p) => new Point(p.x, p.y));
  const line = end.subtract(start);
  const norm = line.normalize();
  const center = start.add(norm.scale(0.5 * line.length));

  const displayMultiplicity = element.name !== UMLPetriNetArc.defaultMultiplicity;

  return (
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
        <ThemedPathContrast d="M0,1 L0,29 L30,15 z" fill={element.strokeColor} />
      </marker>
      <path
        id={`textpath-${element.id}`}
        d={`
        M ${start.x} ${start.y - 10}
        L ${end.x} ${end.y - 10}
    `}
      />
      {displayMultiplicity && (
        <Text
          dy="20px"
          noX
          noY
          fill={element.textColor}
          transform={
            norm.x < 0
              ? `
            translate(${center.x}, ${center.y})
            rotate(180)
            translate(${-center.x}, ${-center.y})
          `
              : undefined
          }
        >
          <textPath xlinkHref={`#textpath-${element.id}`} startOffset="50%">
            {element.name}
          </textPath>
        </Text>
      )}
      <ThemedPolyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        strokeColor={element.strokeColor}
        fillColor="none"
        strokeWidth={1}
        markerEnd={`url(#marker-${element.id})`}
      />
    </g>
  );
};

export interface Props {
  element: UMLPetriNetArc;
}
