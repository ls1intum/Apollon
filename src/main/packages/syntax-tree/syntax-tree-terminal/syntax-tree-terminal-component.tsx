import React, { FunctionComponent } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { SyntaxTreeTerminal } from './syntax-tree-terminal';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const SyntaxTreeTerminalComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <g>
    <ThemedRect width="100%" height="100%" strokeColor={element.strokeColor} />
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
  element: SyntaxTreeTerminal;
  scale: number;
}
