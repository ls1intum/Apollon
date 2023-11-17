import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { CSSProperties } from 'react';
import { SyntaxTreeTerminal } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal';
import { SyntaxTreeTerminalComponent } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal-component';
import { Multiline } from '../../../../../main/utils/svg/multiline';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the syntax-tree-terminal-component', () => {
  const syntaxTreeTerminal: SyntaxTreeTerminal = new SyntaxTreeTerminal({ name: 'SyntaxTreeTerminal' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <SyntaxTreeTerminalComponent element={syntaxTreeTerminal} />
    </svg>,
  );
  expect(getByText(syntaxTreeTerminal.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
