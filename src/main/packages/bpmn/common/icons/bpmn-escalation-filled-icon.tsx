import React, { FunctionComponent } from 'react';
import { ThemedPolyline } from '../../../../components/theme/themedComponents';

export const BPMNEscalationFilledIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={20} width={20}>
    <ThemedPolyline
      points={'10 3, 4 15, 10 12, 16 15, 10 3'}
      strokeLinecap="round"
      strokeLinejoin="round"
      fillColor="currentColor"
      fillRule="evenodd"
    />
  </svg>
);
