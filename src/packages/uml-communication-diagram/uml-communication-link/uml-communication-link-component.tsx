import React, { SFC } from 'react';
import { Direction } from '../../../services/uml-element/uml-element-port';
import { Point } from '../../../utils/geometry/point';
import { CommunicationMessage, UMLCommunicationLink } from './uml-communication-link';

export const UMLCommunicationLinkComponent: SFC<Props> = ({ element }) => {
  const sources: CommunicationMessage[] = element.messages.filter((message) => message.direction === 'source');
  const targets: CommunicationMessage[] = element.messages.filter((message) => message.direction === 'target');

  let position = { x: 0, y: 0 };
  let direction: Direction = Direction.Left;
  // maps element.path to Point to get methods
  // element.path contains start and end point + direction change points
  const path = element.path.map((point) => new Point(point.x, point.y));
  // half distance of total connection
  let distance =
    path.reduce(
      (length, point, i, points) => (i + 1 < points.length ? length + points[i + 1].subtract(point).length : length),
      0,
    ) / 2;

  // finds the connection between two points of path where half distance of total connection is reached
  // and determines the direction of the path there
  for (let index = 0; index < path.length - 1; index++) {
    // distance between two path points
    const vector = path[index + 1].subtract(path[index]);
    if (vector.length > distance) {
      const norm = vector.normalize();
      direction =
        Math.abs(norm.x) > Math.abs(norm.y)
          ? norm.x > 0
            ? Direction.Left
            : Direction.Right
          : norm.y > 0
          ? Direction.Up
          : Direction.Down;
      position = path[index].add(norm.scale(distance));
      break;
    }
    distance -= vector.length;
  }

  return (
    <g>
      {
        {
          [Direction.Up]: (
            <>
              <text
                x={position.x}
                y={position.y}
                dx={5}
                fontSize="85%"
                dominantBaseline="middle"
                textAnchor="start"
                pointerEvents="none"
              >
                <tspan fontWeight="bold" fontSize="120%">
                  {sources.length ? '↓' : ''}
                </tspan>
                {sources.map((source, i) => (
                  <tspan key={i} x={position.x + 20} dy={i === 0 ? undefined : '1.2em'}>
                    {source.name}
                  </tspan>
                ))}
              </text>
              <text
                x={position.x}
                y={position.y}
                dx={-5}
                fontSize="85%"
                dominantBaseline="middle"
                textAnchor="end"
                pointerEvents="none"
              >
                <tspan fontWeight="bold" fontSize="120%">
                  {targets.length ? '↑' : ''}
                </tspan>
                {targets.map((target, i) => (
                  <tspan key={i} x={position.x - 20} dy={i === 0 ? undefined : '1.2em'}>
                    {target.name}
                  </tspan>
                ))}
              </text>
            </>
          ),
          [Direction.Right]: (
            <>
              <text x={position.x} y={position.y} dy={-6} fontSize="85%" textAnchor="middle" pointerEvents="none">
                <tspan fontWeight="bold" fontSize="120%">
                  {targets.length ? '⟶' : ''}
                </tspan>
                {targets.reverse().map((target, i) => (
                  <tspan key={i} x={position.x} dy="-1.2em">
                    {target.name}
                  </tspan>
                ))}
              </text>
              <text x={position.x} y={position.y} dy={18} fontSize="85%" textAnchor="middle" pointerEvents="none">
                <tspan fontWeight="bold" fontSize="120%">
                  {sources.length ? '⟵' : ''}
                </tspan>
                {sources.map((source, i) => (
                  <tspan key={i} x={position.x} dy="1.2em">
                    {source.name}
                  </tspan>
                ))}
              </text>
            </>
          ),
          [Direction.Down]: (
            <>
              <text
                x={position.x}
                y={position.y}
                dx={5}
                fontSize="85%"
                dominantBaseline="middle"
                textAnchor="start"
                pointerEvents="none"
              >
                <tspan fontWeight="bold" fontSize="120%">
                  {targets.length ? '↓' : ''}
                </tspan>
                {targets.reverse().map((target, i) => (
                  <tspan key={i} x={position.x + 20} dy={i === 0 ? undefined : '1.2em'}>
                    {target.name}
                  </tspan>
                ))}
              </text>
              <text
                x={position.x}
                y={position.y}
                dx={-5}
                fontSize="85%"
                dominantBaseline="middle"
                textAnchor="end"
                pointerEvents="none"
              >
                <tspan fontWeight="bold" fontSize="120%">
                  {sources.length ? '↑' : ''}
                </tspan>
                {sources.map((source, i) => (
                  <tspan key={i} x={position.x - 20} dy={i === 0 ? undefined : '1.2em'}>
                    {source.name}
                  </tspan>
                ))}
              </text>
            </>
          ),
          [Direction.Left]: (
            <>
              <text x={position.x} y={position.y} dy={-6} fontSize="85%" textAnchor="middle" pointerEvents="none">
                <tspan fontWeight="bold" fontSize="120%">
                  {sources.length ? '⟶' : ''}
                </tspan>
                {sources.reverse().map((source, i) => (
                  <tspan key={i} x={position.x} dy="-1.2em">
                    {source.name}
                  </tspan>
                ))}
              </text>
              <text x={position.x} y={position.y} dy={18} fontSize="85%" textAnchor="middle" pointerEvents="none">
                <tspan fontWeight="bold" fontSize="120%">
                  {targets.length ? '⟵' : ''}
                </tspan>
                {targets.map((target, i) => (
                  <tspan key={i} x={position.x} dy="1.2em">
                    {target.name}
                  </tspan>
                ))}
              </text>
            </>
          ),
        }[direction]
      }

      <polyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        stroke="black"
        fill="none"
        strokeWidth={1}
      />
    </g>
  );
};

interface Props {
  element: UMLCommunicationLink;
}
