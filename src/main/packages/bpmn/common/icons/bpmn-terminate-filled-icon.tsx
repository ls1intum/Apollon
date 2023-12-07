import React, { FunctionComponent } from 'react';
import { ThemedCircle } from '../../../../components/theme/themedComponents';

export const BPMNTerminateFilledIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={20} width={20}>
    <ThemedCircle cx="50%" cy="50%" r={10} fillColor="currentColor" />
  </svg>
);
