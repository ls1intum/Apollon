import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { SyntaxTreeNonterminal } from '../../../../main/packages/syntax-tree/syntax-tree-nonterminal/syntax-tree-nonterminal';
import {
  SyntaxTreeNonterminalUpdate,
  Props,
} from '../../../../main/packages/syntax-tree/syntax-tree-nonterminal/syntax-tree-nonterminal-update';

export default {
  title: 'Packages/Syntax Tree/Syntax Tree Nonterminal Update',
  component: SyntaxTreeNonterminalUpdate,
} as Meta;

const Template: Story<Props> = (args) => <SyntaxTreeNonterminalUpdate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new SyntaxTreeNonterminal({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    id: '',
    name: 'Syntax Tree Nonterminal',
    owner: null,
  }),
};
