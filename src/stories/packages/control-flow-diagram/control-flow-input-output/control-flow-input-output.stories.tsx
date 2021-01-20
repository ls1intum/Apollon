import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { ControlFlowInputOutput } from '../../../../main/packages/control-flow-diagram/control-flow-input-output/control-flow-input-output';
import {
  ControlFlowInputOutputComponent,
  Props,
} from '../../../../main/packages/control-flow-diagram/control-flow-input-output/control-flow-input-output-component';

export default {
  title: 'Packages/Control Flow Diagram/Control Flow Input Output',
  component: ControlFlowInputOutputComponent,
  args: { isSvg: true },
} as Meta;

const Template: Story<Props> = (args) => <ControlFlowInputOutputComponent {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new ControlFlowInputOutput({
    bounds: { x: 100, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Control Flow Input Output',
    owner: null,
  }),
};
