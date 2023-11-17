import React, { FunctionComponent } from 'react';
import { enhance, FlowchartUpdateComponent, GeneralProps } from '../flowchart-element/flowchart-update';
import { FlowchartFunctionCall } from './flowchart-function-call';

export const FlowchartFunctionCallUpdateComponent: FunctionComponent<Props> = (props) => {
  return <FlowchartUpdateComponent {...props} />;
};

type OwnProps = {
  element: FlowchartFunctionCall;
};

export type Props = OwnProps & GeneralProps;

export const FlowchartFunctionCallUpdate = enhance(FlowchartFunctionCallUpdateComponent);
