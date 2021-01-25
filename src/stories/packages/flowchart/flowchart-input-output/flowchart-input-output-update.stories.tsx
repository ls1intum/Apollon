import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { FlowchartInputOutput } from '../../../../main/packages/flowchart/flowchart-input-output/flowchart-input-output';
import {
  FlowchartInputOutputUpdate,
  Props,
} from '../../../../main/packages/flowchart/flowchart-input-output/flowchart-input-output-update';

export default {
  title: 'Packages/Flowchart/Flowchart Input Output Update',
  component: FlowchartInputOutputUpdate,
} as Meta;

const Template: Story<Props> = (args) => <FlowchartInputOutputUpdate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new FlowchartInputOutput({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Flowchart',
    owner: null,
  }),
};
