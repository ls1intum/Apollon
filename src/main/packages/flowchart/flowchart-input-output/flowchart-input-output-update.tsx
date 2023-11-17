import React, { FunctionComponent } from 'react';
import { enhance, FlowchartUpdateComponent, GeneralProps } from '../flowchart-element/flowchart-update';
import { FlowchartInputOutput } from './flowchart-input-output';

export const FlowchartInputOutputUpdateComponent: FunctionComponent<Props> = (props) => {
  return <FlowchartUpdateComponent {...props} />;
};

type OwnProps = {
  element: FlowchartInputOutput;
};

export type Props = OwnProps & GeneralProps;

export const FlowchartInputOutputUpdate = enhance(FlowchartInputOutputUpdateComponent);
