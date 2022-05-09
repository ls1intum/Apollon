import * as React from 'react';
import { SyntaxTreeLink } from '../../../../../main/packages/syntax-tree/syntax-tree-link/syntax-tree-link';
import { SyntaxTreeLinkComponent } from '../../../../../main/packages/syntax-tree/syntax-tree-link/syntax-tree-link-component';
import { Point } from '../../../../../main/utils/geometry/point';
import { wrappedRender } from '../../../test-utils/render';

it('render the syntax-tree-link-component', () => {
  const syntaxTreeLink: SyntaxTreeLink = new SyntaxTreeLink({ path: [new Point(0, 0), new Point(100, 100)] });
  const { baseElement } = wrappedRender(
    <svg>
      <SyntaxTreeLinkComponent element={syntaxTreeLink} />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
