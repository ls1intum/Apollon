import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { FlowchartDecision } from '../../../../main/packages/flowchart/flowchart-decision/flowchart-decision';
import {
  FlowchartDecisionComponent,
  Props,
} from '../../../../main/packages/flowchart/flowchart-decision/flowchart-decision-component';

export default {
  title: 'Packages/Flowchart Diagram/Flowchart Decision',
  component: FlowchartDecisionComponent,
  args: { isSvg: true },
} as Meta;

const Template: Story<Props> = (args) => <FlowchartDecisionComponent {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new FlowchartDecision({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Flowchart Decision',
    owner: null,
  }),
};
