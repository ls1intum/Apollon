import React, { FunctionComponent } from 'react';
import { BPMNSubprocess } from './bpmn-subprocess';
import { ThemedPolyline, ThemedRect } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';

export const BPMNSubprocessComponent: FunctionComponent<Props> = ({ element, fillColor }) => (
  <g>
    <ThemedRect
      rx={10}
      ry={10}
      width="100%"
      height="100%"
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
    />
    <ThemedRect
      x={element.bounds.width / 2 - 7}
      y={element.bounds.height - 14}
      width={14}
      height={14}
      strokeColor={element.strokeColor}
    />
    <ThemedPolyline
      points={`${element.bounds.width / 2 - 4} ${element.bounds.height - 7}, ${element.bounds.width / 2 + 4} ${
        element.bounds.height - 7
      }`}
    />
    <ThemedPolyline
      points={`${element.bounds.width / 2} ${element.bounds.height - 11}, ${element.bounds.width / 2} ${
        element.bounds.height - 3
      }`}
    />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height / 2}
      width={element.bounds.width}
      height={element.bounds.height}
      fontWeight="bold"
      fill={element.textColor}
      lineHeight={16}
      capHeight={11}
    >
      {element.name}
    </Multiline>
  </g>
);

interface Props {
  element: BPMNSubprocess;
  fillColor?: string;
}
