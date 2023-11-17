import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { CSSProperties } from 'react';
import { SyntaxTreeNonterminal } from '../../../../../main/packages/syntax-tree/syntax-tree-nonterminal/syntax-tree-nonterminal';
import { SyntaxTreeNonterminalComponent } from '../../../../../main/packages/syntax-tree/syntax-tree-nonterminal/syntax-tree-nonterminal-component';
import { Multiline } from '../../../../../main/utils/svg/multiline';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the syntax-tree-nonterminal-component', () => {
  const syntaxTreeNonterminal: SyntaxTreeNonterminal = new SyntaxTreeNonterminal({ name: 'TestActivityComponent' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <SyntaxTreeNonterminalComponent element={syntaxTreeNonterminal} />
    </svg>,
  );
  expect(getByText(syntaxTreeNonterminal.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
