import React from 'react';
import { ThemedPolyline } from '../../../components/theme/themedComponents';

export function SfcEndComponent() {
  const sideLength = 50;
  const halfSideLength = sideLength / 2;

  return (
    <g viewBox={`0 0 ${sideLength} ${sideLength}`}>
      <ThemedPolyline points={`0,0 0,${sideLength} ${sideLength},${halfSideLength} 0,0`} strokeWidth="2" />
    </g>
  );
}
