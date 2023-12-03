import React, { FunctionComponent } from 'react';
import { ThemedRect } from '../../../components/theme/themedComponents';
import { BPMNSwimlane } from './bpmn-swimlane';

export const BPMNSwimlaneComponent: FunctionComponent<Props> = ({ element, children }) => {
  return (
    <g>
      <ThemedRect width={element.bounds.width} height={element.bounds.height} fillColor="transparent" />
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
};

interface Props {
  element: BPMNSwimlane;
  children?: React.ReactNode;
}
