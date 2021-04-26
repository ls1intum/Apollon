import React, { FunctionComponent } from 'react';
import { FlowchartComponent } from '../flowchart-element/flowchart-component';
import { FlowchartFunctionCall } from './flowchart-function-call';

export const FlowchartFunctionCallComponent: FunctionComponent<Props> = ({ element }) => (
  <FlowchartComponent element={element}>
    <rect width="10px" height="100%" stroke={element.color?.stroke || 'black'} x="0" />
    <rect width="calc(100% - 20px)" height="100%" stroke={element.color?.stroke || 'black'} x="10" />
    <rect width="10px" height="100%" stroke={element.color?.stroke || 'black'} x="calc(100% - 10px)" />
  </FlowchartComponent>
);

export interface Props {
  element: FlowchartFunctionCall;
}
