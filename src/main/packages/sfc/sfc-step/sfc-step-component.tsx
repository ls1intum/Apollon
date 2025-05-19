import { ThemedRect } from '../../../components/theme/themedComponents';
import { Text } from '../../../components/controls/text/text';
import React from 'react';
import { SfcEnd } from '../sfc-end/sfc-end';

export function SfcStepComponent({ element }: { element: SfcEnd }) {
  return (
    <g>
      <ThemedRect fillColor={element.fillColor} x="0" y="0" width="100%" height="100%" />
      <Text x="50%" y="50%" fill={element.textColor} textAnchor="middle" dominantBaseline="middle">
        {element.name}
      </Text>
      <ThemedRect x="0" y="0" fillColor="none" width="100%" height="100%" strokeColor={element.strokeColor} />
    </g>
  );
}
