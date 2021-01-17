import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { DropdownItem, Props } from '../../../../main/components/controls/dropdown/dropdown-item';

export default {
  title: 'Controls/Dropdown/Dropdown Item',
  component: DropdownItem,
} as Meta;

const Template: Story<Props> = (args) => <DropdownItem {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'Button',
  value: 5,
};
