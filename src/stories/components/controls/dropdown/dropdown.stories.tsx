import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { Props, Dropdown } from '../../../../main/components/controls/dropdown/dropdown';
import { DropdownItem } from '../../../../main/components/controls/dropdown/dropdown-item';

export default {
  title: 'Controls/Dropdown/Dropdown',
  component: Dropdown,
} as Meta;

const Template: Story<Props> = (args) => <Dropdown {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: [<DropdownItem value={1}>One</DropdownItem>, <DropdownItem value={4}>Four</DropdownItem>],
  value: 0,
  placeholder: 'Placeholder',
};
