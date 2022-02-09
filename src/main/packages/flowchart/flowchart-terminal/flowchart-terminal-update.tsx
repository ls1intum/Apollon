import React, { FunctionComponent } from 'react';
import { FlowchartUpdateComponent, enhance, GeneralProps } from '../flowchart-element/flowchart-update.js';
import { FlowchartTerminal } from './flowchart-terminal.js';

export const FlowchartTerminalUpdateComponent: FunctionComponent<Props> = (props) => {
  return <FlowchartUpdateComponent {...props} />;
};

type OwnProps = {
  element: FlowchartTerminal;
};

export type Props = OwnProps & GeneralProps;

export const FlowchartTerminalUpdate = enhance(FlowchartTerminalUpdateComponent);
