import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { ControlFlowFunctionCall } from '../../../../main/packages/control-flow-diagram/control-flow-function-call/control-flow-function-call';
import {
  ControlFlowFunctionCallUpdate,
  Props,
} from '../../../../main/packages/control-flow-diagram/control-flow-function-call/control-flow-function-call-update';

export default {
  title: 'Packages/Control Flow Diagram/Control Flow Function Call Update',
  component: ControlFlowFunctionCallUpdate,
} as Meta;

const Template: Story<Props> = (args) => <ControlFlowFunctionCallUpdate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new ControlFlowFunctionCall({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Control Flow Diagram',
    owner: null,
  }),
};
