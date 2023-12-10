import React, { FunctionComponent } from 'react';
import { ThemedPolyline, ThemedRect } from '../../../../components/theme/themedComponents';

export const BPMNConditionalIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={20} width={20}>
    <ThemedRect height={16} width={16} x={2} y={2} strokeLinejoin="round" fillColor="transparent" />
    <ThemedPolyline points={'6 7, 14 7'} strokeLinecap="round" strokeLinejoin="round" />
    <ThemedPolyline points={'6 13, 14 13'} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
