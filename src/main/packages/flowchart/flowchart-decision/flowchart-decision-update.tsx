import React, { FunctionComponent } from 'react';
import { FlowchartUpdateComponent, enhance, GeneralProps } from '../flowchart-element/flowchart-update.js';
import { FlowchartDecision } from './flowchart-decision.js';

export const FlowchartDecisionUpdateComponent: FunctionComponent<Props> = (props) => {
  return <FlowchartUpdateComponent {...props} />;
};

type OwnProps = {
  element: FlowchartDecision;
};

export type Props = OwnProps & GeneralProps;

export const FlowchartDecisionUpdate = enhance(FlowchartDecisionUpdateComponent);
