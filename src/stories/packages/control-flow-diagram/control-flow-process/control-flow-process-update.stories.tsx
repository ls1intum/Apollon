import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { ControlFlowProcess } from '../../../../main/packages/control-flow-diagram/control-flow-process/control-flow-process';
import {
  ControlFlowProcessUpdate,
  Props,
} from '../../../../main/packages/control-flow-diagram/control-flow-process/control-flow-process-update';

export default {
  title: 'Packages/Control Flow Diagram/Control Flow Process Update',
  component: ControlFlowProcessUpdate,
} as Meta;

const Template: Story<Props> = (args) => <ControlFlowProcessUpdate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new ControlFlowProcess({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Control Flow Process',
    owner: null,
  }),
};
