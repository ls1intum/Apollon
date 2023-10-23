import React, { FunctionComponent } from 'react';
import { BPMNPool } from './bpmn-pool';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const BPMNPoolComponent: FunctionComponent<Props> = ({ element, children }) => {
  return (
    <g>
      <ThemedRect
        y={0}
        width={BPMNPool.HEADER_WIDTH}
        height={element.bounds.height}
        strokeColor={element.strokeColor}
        fillColor={element.fillColor}
      />
      <ThemedRect
        y={0}
        x={BPMNPool.HEADER_WIDTH}
        width={element.bounds.width - BPMNPool.HEADER_WIDTH}
        height={element.bounds.height}
        strokeColor={element.strokeColor}
        fillColor={element.fillColor}
      />
      <text
        y={20}
        x={-(element.bounds.height / 2)}
        textAnchor="middle"
        alignmentBaseline="middle"
        transform="rotate(270)"
        fontWeight="bold"
        pointerEvents="none"
      >
        {element.name}
      </text>
      {children}
    </g>
  );
};

interface Props {
  element: BPMNPool;
  children?: React.ReactNode;
}
