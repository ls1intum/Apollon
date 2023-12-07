import React, { FunctionComponent } from 'react';
import { ThemedPolyline } from '../../../../components/theme/themedComponents';

export const BPMNLinkIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={20} width={20}>
    <ThemedPolyline
      points={'3 7, 13 7, 13 4, 18 10, 13 16, 13 13, 3 13, 3 7'}
      strokeLinecap="round"
      strokeLinejoin="round"
      fillColor="transparent"
    />
  </svg>
);
