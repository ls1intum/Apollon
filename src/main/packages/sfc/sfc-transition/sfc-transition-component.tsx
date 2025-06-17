import React from 'react';
import { ThemedPolyline } from '../../../components/theme/themedComponents';
import { SfcTransition } from './sfc-transition';
import { Point } from '../../../utils/geometry/point';
import { Text } from '../../../components/controls/text/text';

/**
 * Component for rendering transitions in sfc.
 * Displays a path with a crossbar at the center and the transition condition text.
 */
export const SfcTransitionComponent = ({ element }: { element: SfcTransition }) => {
  const getParsedName = () => {
    try {
      const parsedName = JSON.parse(element.name);
      return parsedName.length === 2 ? parsedName : ['', ''];
    } catch (e) {
      return ['', ''];
    }
  };

  // Calculate the center point and perpendicular vector for the crossbar
  const path = element.path.map((p) => new Point(p.x, p.y));

  if (path.length < 2) {
    return (
      <g>
        <ThemedPolyline
          points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
          strokeColor={element.strokeColor}
          fillColor="none"
          strokeWidth={1}
        />
      </g>
    );
  }

  // Find the segment that contains the 50% point of the total path length
  let totalLength = 0;
  const segmentLengths = [];

  for (let i = 0; i < path.length - 1; i++) {
    const segmentLength = path[i].distanceTo(path[i + 1]);
    segmentLengths.push(segmentLength);
    totalLength += segmentLength;
  }

  const halfLength = totalLength / 2;
  let accumulatedLength = 0;
  let segmentIndex = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    if (accumulatedLength + segmentLengths[i] >= halfLength) {
      segmentIndex = i;
      break;
    }
    accumulatedLength += segmentLengths[i];
  }

  // Calculate how far along the segment the center point is
  const segmentFraction = (halfLength - accumulatedLength) / segmentLengths[segmentIndex];

  // Calculate the center point
  const start = path[segmentIndex];
  const end = path[segmentIndex + 1];
  const line = end.subtract(start);
  const norm = line.normalize();
  const center = start.add(norm.scale(segmentFraction * line.length));

  // Calculate the perpendicular vector for the crossbar
  const perpendicular = new Point(-Math.abs(norm.y), Math.abs(norm.x));
  const crossbarLength = 40;
  const crossbarStart = center.add(perpendicular.scale(-crossbarLength / 2));
  const crossbarEnd = center.add(perpendicular.scale(crossbarLength / 2));

  // Create a text path for the label
  const textOffset = -30; // Distance of text from the crossbar
  const textPosition = center.add(perpendicular.scale(textOffset));

  const parsedName = getParsedName();
  const isNameNegated = parsedName[0] === '!';
  const displayName = parsedName[1];

  const isPerpendicularMoreHorizontal = Math.abs(perpendicular.x) > Math.abs(perpendicular.y);

  return (
    <g>
      <ThemedPolyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        strokeColor={element.strokeColor}
        fillColor="none"
        strokeWidth={1}
      />
      {displayName.length > 0 && (
        <>
          <ThemedPolyline
            points={`${crossbarStart.x},${crossbarStart.y} ${crossbarEnd.x},${crossbarEnd.y}`}
            strokeColor={element.strokeColor}
            fillColor="none"
            strokeWidth={10}
          />
          <Text
            textDecoration={isNameNegated ? 'overline' : undefined}
            x={textPosition.x}
            y={textPosition.y}
            fill={element.textColor}
            textAnchor={isPerpendicularMoreHorizontal ? 'start' : 'middle'}
            dominantBaseline="middle"
          >
            {displayName}
          </Text>
        </>
      )}
    </g>
  );
};
