import React, { FunctionComponent } from 'react';
import { BPMNTransaction } from './bpmn-transaction';
import { ThemedRect } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';

export const BPMNTransactionComponent: FunctionComponent<Props> = ({ element, fillColor }) => (
  <g>
    <ThemedRect
      rx={10}
      ry={10}
      width={element.bounds.width}
      height={element.bounds.height}
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
    />
    <ThemedRect
      rx={7}
      ry={7}
      x={5}
      y={5}
      width={element.bounds.width - 10}
      height={element.bounds.height - 10}
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
  element: BPMNTransaction;
  fillColor?: string;
}
