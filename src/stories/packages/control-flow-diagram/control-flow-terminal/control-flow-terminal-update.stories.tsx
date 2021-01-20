import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { ControlFlowTerminal } from '../../../../main/packages/control-flow-diagram/control-flow-terminal/control-flow-terminal';
import {
  ControlFlowTerminalUpdate,
  Props,
} from '../../../../main/packages/control-flow-diagram/control-flow-terminal/control-flow-terminal-update';

export default {
  title: 'Packages/Control Flow Diagram/Control Flow Terminal Update',
  component: ControlFlowTerminalUpdate,
} as Meta;

const Template: Story<Props> = (args) => <ControlFlowTerminalUpdate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new ControlFlowTerminal({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Control Flow Diagram',
    owner: null,
  }),
};
