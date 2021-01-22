import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { FlowchartFunctionCall } from '../../../../main/packages/flowchart/flowchart-function-call/flowchart-function-call';
import {
  FlowchartFunctionCallUpdate,
  Props,
} from '../../../../main/packages/flowchart/flowchart-function-call/flowchart-function-call-update';

export default {
  title: 'Packages/Flowchart/Flowchart Function Call Update',
  component: FlowchartFunctionCallUpdate,
} as Meta;

const Template: Story<Props> = (args) => <FlowchartFunctionCallUpdate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new FlowchartFunctionCall({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Flowchart Function Call',
    owner: null,
  }),
};
