import React, { FunctionComponent } from 'react';
import { ControlFlowUpdateComponent, enhance, GeneralProps } from '../control-flow-element/control-flow-update';
import { ControlFlowDecision } from './control-flow-decision';

export const ControlFlowDecisionUpdateComponent: FunctionComponent<Props> = (props) => {
  return <ControlFlowUpdateComponent {...props} />;
};

type OwnProps = {
  element: ControlFlowDecision;
};

export type Props = OwnProps & GeneralProps;

export const ControlFlowDecisionUpdate = enhance(ControlFlowDecisionUpdateComponent);
