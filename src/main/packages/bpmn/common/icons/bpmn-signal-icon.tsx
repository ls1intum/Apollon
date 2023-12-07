import React, { FunctionComponent } from 'react';
import { ThemedPolyline } from '../../../../components/theme/themedComponents';

export const BPMNSignalIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={20} width={20}>
    <ThemedPolyline
      points={'10 3, 3 15, 17 15, 10 3'}
      strokeLinecap="round"
      strokeLinejoin="round"
      fillColor="transparent"
    />
  </svg>
);
