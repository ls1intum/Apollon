import React, { FunctionComponent } from 'react';
import { BPMNCallActivity } from './bpmn-call-activity';
import { ThemedRect } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';

export const BPMNCallActivityComponent: FunctionComponent<Props> = ({ element, fillColor, strokeColor, textColor }) => (
  <g>
    <ThemedRect
      rx={10}
      ry={10}
      width={element.bounds.width}
      height={element.bounds.height}
      strokeColor={strokeColor || element.strokeColor}
      strokeWidth={3}
      fillColor={fillColor || element.fillColor}
    />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height / 2}
      width={element.bounds.width}
      height={element.bounds.height}
      fontWeight="bold"
      fill={textColor || element.textColor}
      lineHeight={16}
      capHeight={11}
    >
      {element.name}
    </Multiline>
  </g>
);

interface Props {
  element: BPMNCallActivity;
  fillColor?: string;
  strokeColor?: string;
  textColor?: string;
}
