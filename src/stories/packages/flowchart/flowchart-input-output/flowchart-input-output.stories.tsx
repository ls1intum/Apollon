import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { FlowchartInputOutput } from '../../../../main/packages/flowchart/flowchart-input-output/flowchart-input-output';
import {
  FlowchartInputOutputComponent,
  Props,
} from '../../../../main/packages/flowchart/flowchart-input-output/flowchart-input-output-component';

export default {
  title: 'Packages/Flowchart/Flowchart Input Output',
  component: FlowchartInputOutputComponent,
  args: { isSvg: true },
} as Meta;

const Template: Story<Props> = (args) => <FlowchartInputOutputComponent {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new FlowchartInputOutput({
    bounds: { x: 100, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Flowchart Input Output',
    owner: null,
  }),
};
