import React, { FunctionComponent } from 'react';
import { ThemedPath } from '../../../../components/theme/themedComponents';

export const BpmnLoopMarkerIcon: FunctionComponent<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} height={14} width={14}>
    <ThemedPath
      d={`M7,3 A 4 4 30 1 1 3.535 5`}
      strokeColor={props.stroke}
      fillColor="transparent"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <ThemedPath
      d={`M9.5,1.5 L7,3 L8,6`}
      strokeColor={props.stroke}
      fillColor="transparent"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);
