import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { ControlFlowTerminal } from '../../../../main/packages/control-flow-diagram/control-flow-terminal/control-flow-terminal';
import {
  ControlFlowTerminalComponent,
  Props,
} from '../../../../main/packages/control-flow-diagram/control-flow-terminal/control-flow-terminal-component';

export default {
  title: 'Packages/Control Flow Diagram/Control Flow Terminal',
  component: ControlFlowTerminalComponent,
  args: { isSvg: true },
} as Meta;

const Template: Story<Props> = (args) => <ControlFlowTerminalComponent {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new ControlFlowTerminal({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Control Flow Terminal',
    owner: null,
  }),
};
