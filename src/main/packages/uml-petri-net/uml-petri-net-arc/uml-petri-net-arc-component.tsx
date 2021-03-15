import React, { SFC } from 'react';
import { Point } from '../../../utils/geometry/point';
import { UMLPetriNetArc } from './uml-petri-net-arc';

export const UMLPetriNetArcComponent: SFC<Props> = ({ element }) => {
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
        <path d="M0,1 L0,29 L30,15 z" fill="black" />
      </marker>
      <path
        id={`textpath-${element.id}`}
        d={`
        M ${start.x} ${start.y - 10}
        L ${end.x} ${end.y - 10}
    `}
      />
      {displayMultiplicity && (
        <text
          dominantBaseline="middle"
          textAnchor="middle"
          fontWeight="bold"
          transform={
            norm.x < 0
              ? `
            translate(${center.x}, ${center.y})
            rotate(180)
            translate(${-center.x}, ${-center.y})
          `
              : undefined
          }
          pointerEvents="none"
        >
          <textPath xlinkHref={`#textpath-${element.id}`} startOffset="50%">
            {element.name}
          </textPath>
        </text>
      )}
      <polyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        stroke="black"
        fill="none"
        strokeWidth={1}
        markerEnd={`url(#marker-${element.id})`}
      />
    </g>
  );
};

export interface Props {
  element: UMLPetriNetArc;
}
