import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { DropdownMenu } from '../../../../main/components/controls/dropdown/dropdown-menu';

export default {
  title: 'Controls/Dropdown/Dropdown Menu',
  component: DropdownMenu,
} as Meta;

const Template: Story = (args) => <DropdownMenu {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: <p>Dropdown Menu Children</p>,
};
