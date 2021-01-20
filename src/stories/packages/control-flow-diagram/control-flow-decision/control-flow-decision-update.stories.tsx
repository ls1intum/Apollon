import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { ControlFlowDecision } from '../../../../main/packages/control-flow-diagram/control-flow-decision/control-flow-decision';
import {
  ControlFlowDecisionUpdate,
  Props,
} from '../../../../main/packages/control-flow-diagram/control-flow-decision/control-flow-decision-update';

export default {
  title: 'Packages/Control Flow Diagram/Control Flow Decision Update',
  component: ControlFlowDecisionUpdate,
} as Meta;

const Template: Story<Props> = (args) => <ControlFlowDecisionUpdate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new ControlFlowDecision({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Control Flow Diagram',
    owner: null,
  }),
};
