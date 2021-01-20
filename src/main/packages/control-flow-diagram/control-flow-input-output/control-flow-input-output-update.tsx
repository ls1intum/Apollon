import React, { FunctionComponent } from 'react';
import { ControlFlowUpdateComponent, enhance, GeneralProps } from '../control-flow-element/control-flow-update';
import { ControlFlowInputOutput } from './control-flow-input-output';

export const ControlFlowInputOutputUpdateComponent: FunctionComponent<Props> = (props) => {
  return <ControlFlowUpdateComponent {...props} />;
};

type OwnProps = {
  element: ControlFlowInputOutput;
};

export type Props = OwnProps & GeneralProps;

export const ControlFlowInputOutputUpdate = enhance(ControlFlowInputOutputUpdateComponent);
