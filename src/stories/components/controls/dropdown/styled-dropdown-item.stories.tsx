import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { DropdownItemProps, StyledDropdownItem } from '../../../../main/components/controls/dropdown/dropdown-styles';
import { Button, defaultProps, Props } from '../../../../main/components/controls/button/button';

export default {
  title: 'Controls/Dropdown/Styled Dropdown Item',
  component: StyledDropdownItem,
} as Meta;

const Template: Story<DropdownItemProps> = (args) => <StyledDropdownItem {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  ...defaultProps,
  children: 'Styled Dropdown Item',
};
