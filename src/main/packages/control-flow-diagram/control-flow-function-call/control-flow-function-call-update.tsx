import React, { FunctionComponent } from 'react';
import { ControlFlowUpdateComponent, enhance, GeneralProps } from '../control-flow-element/control-flow-update';
import { ControlFlowFunctionCall } from './control-flow-function-call';

export const ControlFlowFunctionCallUpdateComponent: FunctionComponent<Props> = (props) => {
  return <ControlFlowUpdateComponent {...props} />;
};

type OwnProps = {
  element: ControlFlowFunctionCall;
};

export type Props = OwnProps & GeneralProps;

export const ControlFlowFunctionCallUpdate = enhance(ControlFlowFunctionCallUpdateComponent);
