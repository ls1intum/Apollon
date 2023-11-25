import React, { FunctionComponent } from 'react';
import { Direction } from '../../../services/uml-element/uml-element-port';
import { Point } from '../../../utils/geometry/point';
import { UMLCommunicationLink } from './uml-communication-link';
import { ICommunicationLinkMessage } from './uml-communiction-link-message';
import { UmlCommunicationLinkTextComponent } from './uml-communication-link-text-component';
import { ThemedPolyline } from '../../../components/theme/themedComponents';

export const UMLCommunicationLinkComponent: FunctionComponent<Props> = ({ element }) => {
  const sources: ICommunicationLinkMessage[] = element.messages.filter((message) => message.direction === 'source');
  const targets: ICommunicationLinkMessage[] = element.messages.filter((message) => message.direction === 'target');

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
              <UmlCommunicationLinkTextComponent
                x={position.x + 8}
                y={position.y}
                fill={element.textColor}
                directionIcon="↓"
                messages={sources}
              />
              <UmlCommunicationLinkTextComponent
                x={position.x - 16}
                y={position.y}
                fill={element.textColor}
                directionIcon="↑"
                messages={targets}
              />
            </>
          ),
          [Direction.Right]: (
            <>
              <UmlCommunicationLinkTextComponent
                x={position.x}
                y={position.y}
                fill={element.textColor}
                directionIcon="⟶"
                messages={targets}
                textCentered
              />
              <UmlCommunicationLinkTextComponent
                x={position.x}
                y={position.y + 16}
                fill={element.textColor}
                directionIcon="⟵"
                messages={sources}
                textCentered
              />
            </>
          ),
          [Direction.Down]: (
            <>
              <UmlCommunicationLinkTextComponent
                x={position.x + 8}
                y={position.y}
                fill={element.textColor}
                directionIcon="↓"
                messages={targets}
              />
              <UmlCommunicationLinkTextComponent
                x={position.x - 16}
                y={position.y}
                fill={element.textColor}
                directionIcon="↑"
                messages={sources}
              />
            </>
          ),
          [Direction.Left]: (
            <>
              <UmlCommunicationLinkTextComponent
                x={position.x}
                y={position.y}
                fill={element.textColor}
                directionIcon="⟶"
                messages={sources}
                textCentered
              />
              <UmlCommunicationLinkTextComponent
                x={position.x}
                y={position.y + 16}
                fill={element.textColor}
                directionIcon="⟵"
                messages={targets}
                textCentered
              />
            </>
          ),
        }[direction]
      }

      <ThemedPolyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        strokeColor={element.strokeColor}
        fillColor="none"
        strokeWidth={1}
      />
    </g>
  );
};

interface Props {
  element: UMLCommunicationLink;
}
