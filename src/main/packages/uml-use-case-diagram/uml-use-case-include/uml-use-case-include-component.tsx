import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { Point } from '../../../utils/geometry/point';
import { UMLUseCaseInclude } from './uml-use-case-include';
import { ThemedPath } from '../../../components/theme/themedComponents';
import { uuid } from '../../../utils/uuid';

const Arrow: FunctionComponent<{ color?: string; d: string }> = ({ color, d }) => {
  const id = uuid();
  return (
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
      >
        <ThemedPath d="M0,29 L30,15 L0,1" fillColor="none" strokeColor={color} />
      </marker>
      <ThemedPath d={d} strokeColor={color} strokeDasharray={7} markerEnd={`url(#marker-${id})`} />
    </g>
  );
};

export const UMLUseCaseIncludeComponent: FunctionComponent<Props> = ({ element }) => {
  const [start, end] = element.path.map((p) => new Point(p.x, p.y));
  const line = end.subtract(start);

  if (line.length <= 100) {
    return <Arrow color={element.strokeColor} d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} />;
  }

  const norm = line.normalize();
  const center = start.add(norm.scale(0.5 * line.length));
  const startSection = start.add(norm.scale(0.5 * line.length - 40));
  const endSection = end.subtract(norm.scale(0.5 * line.length - 40));

  const id = uuid();
  return (
    <g>
      <Arrow
        color={element.strokeColor}
        d={`
          M ${start.x} ${start.y} L ${startSection.x} ${startSection.y}
          M ${endSection.x} ${endSection.y} L ${end.x} ${end.y}
        `}
      />
      <path
        id={`textpath-${id}`}
        d={`
          M ${startSection.x} ${startSection.y}
          L ${endSection.x} ${endSection.y}
        `}
      />
      <Text
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
        <textPath xlinkHref={`#textpath-${id}`} startOffset="50%">
          «include»
        </textPath>
      </Text>
    </g>
  );
};

type Props = {
  element: UMLUseCaseInclude;
};
