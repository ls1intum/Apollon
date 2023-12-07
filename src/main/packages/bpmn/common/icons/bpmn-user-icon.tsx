import React, { FunctionComponent } from 'react';
import { ThemedCircle, ThemedPolyline } from '../../../../components/theme/themedComponents';

export const BPMNUserIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={20} width={20}>
    <ThemedCircle cx="10" cy="4" r={4} fillColor="transparent" />
    <ThemedPolyline points={'4 16, 4 11, 16 11, 16 16'} fillColor="transparent" />
  </svg>
);
