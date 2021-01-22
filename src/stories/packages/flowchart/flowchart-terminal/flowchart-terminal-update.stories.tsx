import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { FlowchartTerminal } from '../../../../main/packages/flowchart/flowchart-terminal/flowchart-terminal';
import {
  FlowchartTerminalUpdate,
  Props,
} from '../../../../main/packages/flowchart/flowchart-terminal/flowchart-terminal-update';

export default {
  title: 'Packages/Flowchart Diagram/Flowchart Terminal Update',
  component: FlowchartTerminalUpdate,
} as Meta;

const Template: Story<Props> = (args) => <FlowchartTerminalUpdate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new FlowchartTerminal({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Flowchart Diagram',
    owner: null,
  }),
};
