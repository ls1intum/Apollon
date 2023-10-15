import React, { FunctionComponent } from 'react';
import { BPMNTask } from './bpmn-task';
import { ThemedRect } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';

export const BPMNTaskComponent: FunctionComponent<Props> = ({ element, fillColor }) => (
  <g>
    <ThemedRect
      rx={10}
      ry={10}
      width="100%"
      height="100%"
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
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
  element: BPMNTask;
  fillColor?: string;
}
