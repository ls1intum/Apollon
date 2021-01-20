import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { ControlFlowDecision } from '../../../../main/packages/control-flow-diagram/control-flow-decision/control-flow-decision';
import {
  ControlFlowDecisionComponent,
  Props,
} from '../../../../main/packages/control-flow-diagram/control-flow-decision/control-flow-decision-component';

export default {
  title: 'Packages/Control Flow Diagram/Control Flow Decision',
  component: ControlFlowDecisionComponent,
  args: { isSvg: true },
} as Meta;

const Template: Story<Props> = (args) => <ControlFlowDecisionComponent {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new ControlFlowDecision({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Control Flow Decision',
    owner: null,
  }),
};
