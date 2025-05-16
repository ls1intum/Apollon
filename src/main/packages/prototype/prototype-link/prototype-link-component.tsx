import React from 'react';
import { ThemedPolyline } from '../../../components/theme/themedComponents';
import { PrototypeLink } from './prototype-link';

interface Props {
  element: PrototypeLink;
}

export function PrototypeLinkComponent({ element }: Props) {
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
