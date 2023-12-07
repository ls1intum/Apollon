import React, { FunctionComponent } from 'react';
import { ThemedPolyline } from '../../../../components/theme/themedComponents';

export const BPMNMessageFilledIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={20} width={20}>
    <ThemedPolyline
      points={'0.2 3, 19.8 3, 10 11, 0.2 3'}
      strokeLinecap="round"
      strokeLinejoin="round"
      fillColor="currentColor"
    />
    <ThemedPolyline
      points={'0 5.5, 0 17, 20 17, 20 5.5, 10 13.5, 0 5.5'}
      strokeLinecap="round"
      strokeLinejoin="round"
      fillColor="currentColor"
    />
  </svg>
);
