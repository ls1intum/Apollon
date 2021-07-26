import React, { SFC } from 'react';
import { Text } from '../../../components/controls/text/text';
import { Point } from '../../../utils/geometry/point';
import { UMLUseCaseAssociation } from './uml-use-case-association';

export const UMLUseCaseAssociationComponent: SFC<Props> = ({ element }) => {
  const [start, end] = element.path.map((p) => new Point(p.x, p.y));
  const line = end.subtract(start);
  const norm = line.normalize();
  const center = start.add(norm.scale(0.5 * line.length));

  return (
    <g>
      <path
        id={`textpath-${element.id}`}
        d={`
        M ${start.x} ${start.y - 10}
        L ${end.x} ${end.y - 10}
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
        <textPath xlinkHref={`#textpath-${element.id}`} startOffset="50%">
          {element.name}
        </textPath>
      </Text>
      <polyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        stroke={element.strokeColor || 'black'}
        fill="none"
        strokeWidth={1}
      />
    </g>
  );
};

interface Props {
  element: UMLUseCaseAssociation;
}
