import React, { FunctionComponent } from 'react';
import { enhance, FlowchartUpdateComponent, GeneralProps } from '../flowchart-element/flowchart-update';
import { FlowchartDecision } from './flowchart-decision';

export const FlowchartDecisionUpdateComponent: FunctionComponent<Props> = (props) => {
  return <FlowchartUpdateComponent {...props} />;
};

type OwnProps = {
  element: FlowchartDecision;
};

export type Props = OwnProps & GeneralProps;

export const FlowchartDecisionUpdate = enhance(FlowchartDecisionUpdateComponent);
