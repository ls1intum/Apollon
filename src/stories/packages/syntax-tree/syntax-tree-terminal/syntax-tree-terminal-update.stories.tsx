import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { SyntaxTreeTerminal } from '../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal';
import {
  SyntaxTreeTerminalUpdate,
  Props,
} from '../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal-update';

export default {
  title: 'Packages/Syntax Tree/Syntax Tree Terminal Update',
  component: SyntaxTreeTerminalUpdate,
} as Meta;

const Template: Story<Props> = (args) => <SyntaxTreeTerminalUpdate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new SyntaxTreeTerminal({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Syntax Tree Terminal',
    owner: null,
  }),
};
