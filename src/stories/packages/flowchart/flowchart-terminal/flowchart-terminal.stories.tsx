import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { FlowchartTerminal } from '../../../../main/packages/flowchart/flowchart-terminal/flowchart-terminal';
import {
  FlowchartTerminalComponent,
  Props,
} from '../../../../main/packages/flowchart/flowchart-terminal/flowchart-terminal-component';

export default {
  title: 'Packages/Flowchart Diagram/Flowchart Terminal',
  component: FlowchartTerminalComponent,
  args: { isSvg: true },
} as Meta;

const Template: Story<Props> = (args) => <FlowchartTerminalComponent {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new FlowchartTerminal({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Flowchart Terminal',
    owner: null,
  }),
};
