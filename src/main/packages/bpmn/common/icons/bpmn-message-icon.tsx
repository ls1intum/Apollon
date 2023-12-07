import React, { FunctionComponent } from 'react';
import { ThemedPolyline } from '../../../../components/theme/themedComponents';

export const BPMNMessageIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={20} width={20}>
    <ThemedPolyline
      points={'0 3, 0 17, 20 17, 20 3, 10 11, 0 3, 20 3'}
      strokeLinecap="round"
      strokeLinejoin="round"
      fillColor="transparent"
    />
  </svg>
);
