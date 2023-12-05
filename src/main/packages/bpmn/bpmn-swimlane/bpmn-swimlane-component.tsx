import React, { FunctionComponent } from 'react';
import { ThemedRect } from '../../../components/theme/themedComponents';
import { BPMNSwimlane } from './bpmn-swimlane';
import { Multiline } from '../../../utils/svg/multiline';

export const BPMNSwimlaneComponent: FunctionComponent<Props> = ({ element, fillColor, textColor, children }) => {
  return (
    <g>
      <ThemedRect
        width={element.bounds.width}
        height={element.bounds.height}
        fillColor={fillColor || element.fillColor}
      />
      <Multiline
        y={20}
        x={-(element.bounds.height / 2)}
        transform="rotate(270)"
        textAnchor="middle"
        alignmentBaseline="middle"
        pointerEvents="none"
        fill={textColor || element.textColor}
      >
        {element.name}
      </Multiline>
      {children}
    </g>
  );
};

interface Props {
  element: BPMNSwimlane;
  fillColor?: string;
  textColor?: string;
  children?: React.ReactNode;
}
