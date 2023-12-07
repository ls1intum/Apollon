import React, { FunctionComponent } from 'react';
import { ThemedPolyline, ThemedRect } from '../../../../components/theme/themedComponents';

export const BPMNBusinessRuleIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={20} width={20}>
    <ThemedRect height={16} width={16} x={2} y={2} strokeLinejoin="round" fillColor="transparent" />
    <ThemedRect height={4} width={16} x={2} y={2} strokeLinejoin="round" fillColor="currentColor" />
    <ThemedPolyline points={'2 10, 18 10'} strokeLinecap="round" strokeLinejoin="round" />
    <ThemedPolyline points={'2 14, 18 14'} strokeLinecap="round" strokeLinejoin="round" />
    <ThemedPolyline points={'6 2, 6 18'} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
