import React, { SFC } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { SyntaxTreeTerminal } from './syntax-tree-terminal';

export const SyntaxTreeTerminalComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect width="100%" height="100%" stroke={element.color?.stroke || 'black'} />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height / 2}
      width={element.bounds.width}
      height={element.bounds.height}
      fontWeight="bold"
    >
      {element.name}
    </Multiline>
  </g>
);

export interface Props {
  element: SyntaxTreeTerminal;
}
