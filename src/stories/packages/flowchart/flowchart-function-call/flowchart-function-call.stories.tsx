import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { FlowchartFunctionCall } from '../../../../main/packages/flowchart/flowchart-function-call/flowchart-function-call';
import {
  FlowchartFunctionCallComponent,
  Props,
} from '../../../../main/packages/flowchart/flowchart-function-call/flowchart-function-call-component';

export default {
  title: 'Packages/Flowchart Diagram/Flowchart Function Call',
  component: FlowchartFunctionCallComponent,
  args: { isSvg: true },
} as Meta;

const Template: Story<Props> = (args) => <FlowchartFunctionCallComponent {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new FlowchartFunctionCall({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Flowchart Function Call',
    owner: null,
  }),
};
