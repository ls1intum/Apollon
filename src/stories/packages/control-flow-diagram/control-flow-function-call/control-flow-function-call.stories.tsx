import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { ControlFlowFunctionCall } from '../../../../main/packages/control-flow-diagram/control-flow-function-call/control-flow-function-call';
import {
  ControlFlowFunctionCallComponent,
  Props,
} from '../../../../main/packages/control-flow-diagram/control-flow-function-call/control-flow-function-call-component';

export default {
  title: 'Packages/Control Flow Diagram/Control Flow Function Call',
  component: ControlFlowFunctionCallComponent,
  args: { isSvg: true },
} as Meta;

const Template: Story<Props> = (args) => <ControlFlowFunctionCallComponent {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new ControlFlowFunctionCall({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Control Flow Function Call',
    owner: null,
  }),
};
