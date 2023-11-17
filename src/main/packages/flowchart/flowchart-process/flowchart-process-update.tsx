import React, { FunctionComponent } from 'react';
import { enhance, FlowchartUpdateComponent, GeneralProps } from '../flowchart-element/flowchart-update';
import { FlowchartProcess } from './flowchart-process';

export const FlowchartProcessUpdateComponent: FunctionComponent<Props> = (props) => {
  return <FlowchartUpdateComponent {...props} />;
};

type OwnProps = {
  element: FlowchartProcess;
};

export type Props = OwnProps & GeneralProps;

export const FlowchartProcessUpdate = enhance(FlowchartProcessUpdateComponent);
