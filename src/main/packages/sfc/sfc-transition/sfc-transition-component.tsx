import React from 'react';
import { ThemedPolyline } from '../../../components/theme/themedComponents';
import { SfcTransition } from './sfc-transition';

interface Props {
  element: SfcTransition;
}

export function SfcTransitionComponent({ element }: Props) {
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
