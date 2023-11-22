import React, { FunctionComponent } from 'react';
import { ThemedPath } from '../../../components/theme/themedComponents';

export const BPMNManualIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={20} width={20}>
    <ThemedPath
      d="M5 2.00001C5 3.00001 5 10 5 10M5 2.00001C5 1 7 0.999998 7 1.99999M5 2.00001C5 2.00001 5 5 5 4C5 2.99999 3 2.93337 3 4C3 5.06663 3 12 3 12C3 12 3 11 3 10C3 8.99999 1 8.99999 1 10C1 11 1 14 1 14L3 16V19L9 19V16L11 14V10.5625C11 10.5625 11 7 11 6C11 5 9 5 9 6C9 7 9 4 9 4M7 1.99999C7 2.99998 7 10 7 10M7 1.99999C7 1.99999 7 5 7 4C7 3 9 3 9 4M9 4V10"
      strokeLinejoin="round"
    />
  </svg>
);
