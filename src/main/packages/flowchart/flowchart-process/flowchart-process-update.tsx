import React, { FunctionComponent } from 'react';
import { FlowchartUpdateComponent, enhance, GeneralProps } from '../flowchart-element/flowchart-update.js';
import { FlowchartProcess } from './flowchart-process.js';

export const FlowchartProcessUpdateComponent: FunctionComponent<Props> = (props) => {
  return <FlowchartUpdateComponent {...props} />;
};

type OwnProps = {
  element: FlowchartProcess;
};

export type Props = OwnProps & GeneralProps;

export const FlowchartProcessUpdate = enhance(FlowchartProcessUpdateComponent);
