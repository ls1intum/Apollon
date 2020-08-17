import React, { SFC, SVGProps } from 'react';
import { Point } from '../../../utils/geometry/point';
import { UMLUseCaseExtend } from './uml-use-case-extend';

const Arrow: SFC<{ id: string } & SVGProps<SVGPathElement>> = ({ id, ...props }) => (
  <g>
    <marker
      id={`marker-${id}`}
      viewBox="0 0 30 30"
      markerWidth="22"
      markerHeight="30"
      refX="30"
      refY="15"
      orient="auto"
      markerUnits="strokeWidth"
      strokeDasharray="1,0"
    >
      <path d="M0,29 L30,15 L0,1" fill="none" stroke="black" />
    </marker>
    <path {...props} stroke="black" strokeDasharray={7} markerEnd={`url(#marker-${id})`} />
  </g>
);

export const UMLUseCaseExtendComponent: SFC<Props> = ({ element }) => {
  const [start, end] = element.path.map((p) => new Point(p.x, p.y));
  const line = end.subtract(start);

  if (line.length <= 100) {
    return <Arrow id={element.id} d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} />;
  }

  const norm = line.normalize();
  const center = start.add(norm.scale(0.5 * line.length));
  const startSection = start.add(norm.scale(0.5 * line.length - 40));
  const endSection = end.subtract(norm.scale(0.5 * line.length - 40));
  return (
    <g>
      <Arrow
        id={element.id}
        d={`
          M ${start.x} ${start.y} L ${startSection.x} ${startSection.y}
          M ${endSection.x} ${endSection.y} L ${end.x} ${end.y}
        `}
      />
      <path
        id={`textpath-${element.id}`}
        d={`
          M ${startSection.x} ${startSection.y}
          L ${endSection.x} ${endSection.y}
        `}
      />
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
          «extend»
        </textPath>
      </text>
    </g>
  );
};

type Props = {
  element: UMLUseCaseExtend;
};
