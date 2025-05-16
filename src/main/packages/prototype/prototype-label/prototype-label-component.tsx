import React from 'react';
import { ThemedRect } from '../../../components/theme/themedComponents';
import { Text } from '../../../components/controls/text/text';
import { PrototypeLabel } from './prototype-label';

interface Props {
  element: PrototypeLabel;
  fillColor?: string;
}

export function PrototypeLabelComponent({ element, fillColor }: Props) {
  return (
    <g>
      <ThemedRect fillColor={fillColor || element.fillColor} strokeColor="none" width="100%" height="100%" />
      <Text x={10} fill={element.textColor} fontWeight="normal" textAnchor="start">
        {element.name}
      </Text>
    </g>
  );
}
