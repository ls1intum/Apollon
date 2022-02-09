import React, { FunctionComponent } from 'react';
import { SyntaxTreeLink } from './syntax-tree-link.js';

export const SyntaxTreeLinkComponent: FunctionComponent<Props> = ({ element }) => {
  return (
    <g>
      <polyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        stroke={element.strokeColor || 'black'}
        fill="none"
        strokeWidth={1}
      />
    </g>
  );
};

interface Props {
  element: SyntaxTreeLink;
}
