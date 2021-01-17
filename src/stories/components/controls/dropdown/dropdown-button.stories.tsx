import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { Button, defaultProps, Props } from '../../../../main/components/controls/button/button';
import { DropdownButton } from '../../../../main/components/controls/dropdown/dropdown-button';

export default {
  title: 'Controls/Dropdown/Dropdown Button',
  component: DropdownButton,
  argTypes: {
    color: { control: { type: 'select', options: ['primary', 'secondary', 'link'] } },
  },
} as Meta;

const Template: Story = (args) => <DropdownButton {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  ...defaultProps,
  children: 'Button',
};
