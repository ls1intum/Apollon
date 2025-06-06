import React from 'react';
import { ThemedPolyline, ThemedRect } from '../../../components/theme/themedComponents';
import { Text } from '../../../components/controls/text/text';
import { SfcJump } from './sfc-jump';

/**
 * Component for rendering a jump element in a sfc.
 * Displays a triangular shape with the jump target name.
 */
export function SfcJumpComponent({ element }: { element: SfcJump }) {
  const sideLength = 20;
  const halfSideLength = sideLength / 2;

  return (
    <g>
      <ThemedRect
        fillColor="#00000000"
        strokeColor="none"
        width={element.bounds.width}
        height={element.bounds.height}
      />
      <ThemedPolyline
        fillColor={element.fillColor}
        strokeColor={element.strokeColor}
        points={`0,0 0,${sideLength} ${sideLength},${halfSideLength} 0,0`}
        strokeWidth="2"
      />
      <Text fill={element.textColor}>{element.name}</Text>
    </g>
  );
}
