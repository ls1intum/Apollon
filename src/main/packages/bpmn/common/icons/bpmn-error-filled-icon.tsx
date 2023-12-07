import React, { FunctionComponent } from 'react';
import { ThemedPolyline } from '../../../../components/theme/themedComponents';

export const BPMNErrorFilledIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={20} width={20}>
    <ThemedPolyline
      points={'3 16, 6 4, 13 11, 17 4, 14 16, 7 10, 3 16'}
      strokeLinecap="round"
      strokeLinejoin="round"
      fillColor="currentColor"
    />
  </svg>
);
