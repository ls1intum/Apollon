import React, { FunctionComponent } from 'react';
import { UMLPetriNetPlace } from './uml-petri-net-place';
import { Point } from '../../../utils/geometry/point';
import { Text } from '../../../components/controls/text/text';
import { ThemedCircle, ThemedCircleContrast } from '../../../components/theme/themedComponents';

const maxAmountCircles = 5;
const tokenToBoundaryDistance = 5;
const tokenToTokenDistance = 2.5;

const calculateTokenRadius = (amountOfTokens: number, outerRadius: number) => {
  if (amountOfTokens <= 2) {
    return outerRadius / 2;
  } else {
    // only works for 3 - 9 circles !!
    return outerRadius / (1 + 1 / Math.sin(Math.PI / amountOfTokens));
  }
};

const calculatePositions = (amountOfTokens: number, outerRadius: number): Point[] => {
  const positions: Point[] = [];
  if (amountOfTokens === 1) {
    positions.push(new Point(0, 0));
  } else {
    const degreeFraction = (2 * Math.PI) / amountOfTokens;
    const tokenRadius = calculateTokenRadius(maxAmountCircles, outerRadius);
    const tokenCenterCircleRadius =
      outerRadius + (tokenToTokenDistance * amountOfTokens) / maxAmountCircles - tokenRadius;
    for (let i = 0; i < amountOfTokens; i++) {
      const degree = i * degreeFraction + (1 / 2) * Math.PI;
      positions.push(new Point(Math.cos(degree) * tokenCenterCircleRadius, Math.sin(degree) * tokenCenterCircleRadius));
    }
  }
  return positions;
};

export const UMLPetriNetPlaceComponent: FunctionComponent<Props> = ({ element, fillColor }) => {
  // radius of the outer circle
  const radius = Math.min(element.bounds.width, element.bounds.height) / 2;
  const displayTokenAsNumber = element.amountOfTokens > 0 && element.amountOfTokens > maxAmountCircles;
  const displayCapacity = element.capacity !== UMLPetriNetPlace.defaultCapacity;
  // positions of tokens in UI
  let tokenPositions: Point[] = [];
  let tokenRadius: number;
  // calculate token props
  if (element.amountOfTokens > 0) {
    if (!displayTokenAsNumber) {
      const radiusWithPadding = radius - tokenToBoundaryDistance;
      tokenPositions = calculatePositions(element.amountOfTokens, radiusWithPadding);
      tokenRadius = calculateTokenRadius(maxAmountCircles, radiusWithPadding);
    }
  }
  return (
    <g>
      <ThemedCircle
        cx="50%"
        cy="50%"
        r={radius}
        strokeColor={element.strokeColor}
        strokeWidth={1}
        fillColor={fillColor || element.fillColor}
        fillOpacity={1}
      />
      {!displayTokenAsNumber &&
        tokenPositions.map((position, index) => (
          <ThemedCircleContrast
            key={index}
            cx={radius + position.x}
            cy={radius + position.y}
            r={tokenRadius}
            strokeColor="none"
            fillColor={element.strokeColor}
            fillOpacity={1}
          />
        ))}
      {displayTokenAsNumber && <Text fill={element.strokeColor}>{element.amountOfTokens}</Text>}
      {displayCapacity && (
        <text x="95%" y={5} pointerEvents="none" style={element.textColor ? { fill: element.textColor } : {}}>
          C={element.capacity}
        </text>
      )}
      <Text fill={element.textColor} y={element.bounds.height + 15}>
        {element.name}
      </Text>
    </g>
  );
};

interface Props {
  element: UMLPetriNetPlace;
  fillColor?: string;
}
