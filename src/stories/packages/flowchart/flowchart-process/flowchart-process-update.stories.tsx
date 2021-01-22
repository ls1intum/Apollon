import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { FlowchartProcess } from '../../../../main/packages/flowchart/flowchart-process/control-flow-process';
import {
  FlowchartProcessUpdate,
  Props,
} from '../../../../main/packages/flowchart/flowchart-process/flowchart-process-update';

export default {
  title: 'Packages/Flowchart Diagram/Flowchart Process Update',
  component: FlowchartProcessUpdate,
} as Meta;

const Template: Story<Props> = (args) => <FlowchartProcessUpdate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new FlowchartProcess({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Flowchart Process',
    owner: null,
  }),
};
