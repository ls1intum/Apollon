import React, { FunctionComponent } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { SyntaxTreeNonterminal } from './syntax-tree-nonterminal';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const SyntaxTreeNonterminalComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <g>
    <ThemedRect
      rx={10 * scale}
      ry={10 * scale}
      width="100%"
      height="100%"
      strokeColor={element.strokeColor}
      fillColor={element.fillColor}
    />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height / 2}
      width={element.bounds.width}
      height={element.bounds.height}
      fontWeight="bold"
      fill={element.textColor}
      lineHeight={16 * scale}
      capHeight={11 * scale}
    >
      {element.name}
    </Multiline>
  </g>
);

export interface Props {
  element: SyntaxTreeNonterminal;
  scale: number;
}
