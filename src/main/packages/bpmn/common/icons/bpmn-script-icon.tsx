import React, { FunctionComponent } from 'react';
import { ThemedPolyline, ThemedRect } from '../../../../components/theme/themedComponents';

export const BPMNScriptIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={20} width={20}>
    <ThemedRect height={16} width={16} x={2} y={2} strokeLinejoin="round" fillColor="transparent" />
    <ThemedPolyline points={'6 6, 12 6'} strokeLinecap="round" strokeLinejoin="round" />
    <ThemedPolyline points={'6 10, 14 10'} strokeLinecap="round" strokeLinejoin="round" />
    <ThemedPolyline points={'6 14, 10 14'} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
