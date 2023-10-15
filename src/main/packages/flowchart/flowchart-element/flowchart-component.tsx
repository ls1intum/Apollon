import React, { FunctionComponent } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { FlowchartElement } from '../index';

export const FlowchartComponent: FunctionComponent<Props> = ({ element, children }) => (
  <g>
    {children}
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

export interface Props {
  element: FlowchartElement;
  children?: React.ReactNode;
}
