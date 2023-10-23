import React, { FunctionComponent } from 'react';
import { BPMNPool } from '../bpmn-pool/bpmn-pool';
import { ThemedPolyline, ThemedRect } from '../../../components/theme/themedComponents';

export const BPMNSwimlaneComponent: FunctionComponent<Props> = ({ element, children }) => (
  <g>
    <ThemedRect width={'100%'} height={element.bounds.height} fillColor="transparent" />
    <text
      y={20}
      x={-(element.bounds.height / 2)}
      transform="rotate(270)"
      textAnchor="middle"
      alignmentBaseline="middle"
      pointerEvents="none"
    >
      {element.name}
    </text>
    {children}
  </g>
);

interface Props {
  element: BPMNPool;
  children?: React.ReactNode;
}
