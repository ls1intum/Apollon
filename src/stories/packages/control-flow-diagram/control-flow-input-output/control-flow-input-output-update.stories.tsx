import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { ControlFlowInputOutput } from '../../../../main/packages/control-flow-diagram/control-flow-input-output/control-flow-input-output';
import {
  ControlFlowInputOutputUpdate,
  Props,
} from '../../../../main/packages/control-flow-diagram/control-flow-input-output/control-flow-input-output-update';

export default {
  title: 'Packages/Control Flow Diagram/Control Flow Input Output Update',
  component: ControlFlowInputOutputUpdate,
} as Meta;

const Template: Story<Props> = (args) => <ControlFlowInputOutputUpdate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new ControlFlowInputOutput({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Control Flow Diagram',
    owner: null,
  }),
};
