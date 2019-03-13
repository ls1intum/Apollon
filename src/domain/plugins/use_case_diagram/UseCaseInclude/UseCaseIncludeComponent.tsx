import React, { SFC, version } from 'react';
import UseCaseInclude from './UseCaseInclude';

const UseCaseIncludeComponent: SFC<Props> = ({ element }) => {
  const v = {
    x: element.path[1].x - element.path[0].x,
    y: element.path[1].y - element.path[0].y,
  };
  const length = Math.sqrt(v.x * v.x + v.y * v.y);
  const u = { x: v.x / length, y: v.y / length };
  const center = {
    x: element.path[0].x + 0.5 * length * u.x,
    y: element.path[0].y + 0.5 * length * u.y,
  };
  const pointOne = {
    x: element.path[0].x + (0.5 * length - 50) * u.x,
    y: element.path[0].y + (0.5 * length - 50) * u.y,
  };
  const pointTwo = {
    x: element.path[1].x - (0.5 * length - 50) * u.x,
    y: element.path[1].y - (0.5 * length - 50) * u.y,
  };
  if (length <= 100) {
    return (
      <path
        stroke="black"
        d={`M ${element.path[0].x} ${element.path[0].y} L ${
          element.path[1].x
        } ${element.path[1].y}`}
        strokeDasharray={7}
        markerEnd="url(#RelationshipKind_Arrow)"
      />
    );
  }
  return (
    <g>
      <path
        stroke="black"
        d={`M ${element.path[0].x} ${element.path[0].y} L ${pointOne.x} ${
          pointOne.y
        } M ${pointTwo.x} ${pointTwo.y} L ${element.path[1].x} ${
          element.path[1].y
        }`}
        strokeDasharray={7}
        markerEnd="url(#RelationshipKind_Arrow)"
      />
      <path
        id={`textpath-${element.id}`}
        d={`M ${pointOne.x} ${pointOne.y} L ${pointTwo.x} ${pointTwo.y}`}
      />
      <text
        dominantBaseline="middle"
        textAnchor="middle"
        fontWeight="bold"
        transform={
          (u.x < 0 &&
            `translate(${center.x}, ${
              center.y
            }) rotate(180) translate(${-center.x}, ${-center.y})`) ||
          undefined
        }
      >
        <textPath xlinkHref={`#textpath-${element.id}`} startOffset="50%">
          «include»
        </textPath>
      </text>
    </g>
  );
};

interface Props {
  element: UseCaseInclude;
}

export default UseCaseIncludeComponent;
