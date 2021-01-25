import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { Button, defaultProps, Props } from '../../../main/components/controls/button/button';

export default {
  title: 'Controls/Button',
  component: Button,
  argTypes: {
    color: { control: { type: 'select', options: ['primary', 'secondary', 'link'] } },
  },
} as Meta;

const Template: Story<Props> = (args) => <Button {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  ...defaultProps,
  children: 'Button',
};
