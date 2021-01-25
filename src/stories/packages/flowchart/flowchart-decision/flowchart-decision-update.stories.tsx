import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { FlowchartDecision } from '../../../../main/packages/flowchart/flowchart-decision/flowchart-decision';
import {
  FlowchartDecisionUpdate,
  Props,
} from '../../../../main/packages/flowchart/flowchart-decision/flowchart-decision-update';

export default {
  title: 'Packages/Flowchart/Flowchart Decision Update',
  component: FlowchartDecisionUpdate,
} as Meta;

const Template: Story<Props> = (args) => <FlowchartDecisionUpdate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new FlowchartDecision({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Flowchart Decision',
    owner: null,
  }),
};
