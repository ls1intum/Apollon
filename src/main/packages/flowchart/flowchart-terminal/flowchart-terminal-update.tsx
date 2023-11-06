import React, { FunctionComponent } from 'react';
import { enhance, FlowchartUpdateComponent, GeneralProps } from '../flowchart-element/flowchart-update';
import { FlowchartTerminal } from './flowchart-terminal';

export const FlowchartTerminalUpdateComponent: FunctionComponent<Props> = (props) => {
  return <FlowchartUpdateComponent {...props} />;
};

type OwnProps = {
  element: FlowchartTerminal;
};

export type Props = OwnProps & GeneralProps;

export const FlowchartTerminalUpdate = enhance(FlowchartTerminalUpdateComponent);
