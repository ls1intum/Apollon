import React, { SFC } from 'react';
import { SyntaxTreeLink } from './syntax-tree-link';

export const SyntaxTreeLinkComponent: SFC<Props> = ({ element }) => {
  return (
    <g>
      <polyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        stroke={element.color?.stroke || 'black'}
        fill="none"
        strokeWidth={1}
      />
    </g>
  );
};

interface Props {
  element: SyntaxTreeLink;
}
