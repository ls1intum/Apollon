import React, { FunctionComponent } from 'react';
import { ControlFlowUpdateComponent, enhance, GeneralProps } from '../control-flow-element/control-flow-update';
import { ControlFlowTerminal } from './control-flow-terminal';

export const ControlFlowTerminalUpdateComponent: FunctionComponent<Props> = (props) => {
  return <ControlFlowUpdateComponent {...props} />;
};

type OwnProps = {
  element: ControlFlowTerminal;
};

export type Props = OwnProps & GeneralProps;

export const ControlFlowTerminalUpdate = enhance(ControlFlowTerminalUpdateComponent);
