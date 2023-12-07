import React, { FunctionComponent } from 'react';
import { ThemedCircle, ThemedPolyline } from '../../../../components/theme/themedComponents';

export const BPMNTimerIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={20} width={20}>
    <ThemedCircle cx="50%" cy="50%" r={10} fillColor="transparent" />
    <ThemedPolyline points={'10 4, 10 10, 13 13'} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
