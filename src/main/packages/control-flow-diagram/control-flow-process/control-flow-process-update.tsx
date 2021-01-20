import React, { FunctionComponent } from 'react';
import { ControlFlowUpdateComponent, enhance, GeneralProps } from '../control-flow-element/control-flow-update';
import { ControlFlowProcess } from './control-flow-process';

export const ControlFlowProcessUpdateComponent: FunctionComponent<Props> = (props) => {
  return <ControlFlowUpdateComponent {...props} />;
};

type OwnProps = {
  element: ControlFlowProcess;
};

export type Props = OwnProps & GeneralProps;

export const ControlFlowProcessUpdate = enhance(ControlFlowProcessUpdateComponent);
