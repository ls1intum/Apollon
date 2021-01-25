import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { FlowchartFlowline } from '../../../../main/packages/flowchart/flowchart-flowline/flowchart-flowline';
import {
  Props,
  FlowchartFlowlineComponent,
} from '../../../../main/packages/flowchart/flowchart-flowline/flowchart-flowline-component';

export default {
  title: 'Packages/Flowchart/Flowchart Flowline',
  component: FlowchartFlowlineComponent,
  args: { isSvg: true },
} as Meta;

const Template: Story<Props> = (args) => <FlowchartFlowlineComponent {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new FlowchartFlowline({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '1',
    name: 'Flowchart Flowline',
    owner: null,
  }),
};
