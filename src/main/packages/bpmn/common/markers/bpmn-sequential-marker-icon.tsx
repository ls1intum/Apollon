import React, { FunctionComponent } from 'react';
import { ThemedPolyline } from '../../../../components/theme/themedComponents';

export const BPMNSequentialMarkerIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={14} width={14}>
    <ThemedPolyline
      points={'3 3, 11 3'}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeColor={props.stroke}
      fillColor="currentColor"
    />
    <ThemedPolyline
      points={'3 7, 11 7'}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeColor={props.stroke}
      fillColor="currentColor"
    />
    <ThemedPolyline
      points={'3 11, 11 11'}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeColor={props.stroke}
      fillColor="currentColor"
    />
  </svg>
);
