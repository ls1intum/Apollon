import React, { SFC } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { SyntaxTreeNonterminal } from './syntax-tree-nonterminal';

export const SyntaxTreeNonterminalComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect rx={10} ry={10} width="100%" height="100%" stroke={element.color?.stroke || 'black'} />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height / 2}
      width={element.bounds.width}
      height={element.bounds.height}
      fontWeight="bold"
      fill={element.color?.text}
    >
      {element.name}
    </Multiline>
  </g>
);

export interface Props {
  element: SyntaxTreeNonterminal;
}
