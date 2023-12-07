import React, { FunctionComponent } from 'react';
import { ThemedPolyline } from '../../../../components/theme/themedComponents';

export const BPMNSignalFilledIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={20} width={20}>
    <ThemedPolyline
      points={'10 3, 3 15, 17 15, 10 3'}
      strokeLinecap="round"
      strokeLinejoin="round"
      fillColor="currentColor"
      fillRule="evenodd"
    />
  </svg>
);
