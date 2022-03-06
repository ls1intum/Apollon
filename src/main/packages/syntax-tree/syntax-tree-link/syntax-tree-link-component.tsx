import React, { FunctionComponent } from 'react';
import { SyntaxTreeLink } from './syntax-tree-link';
import { ThemedPolyline } from '../../../components/theme/themedComponents';

export const SyntaxTreeLinkComponent: FunctionComponent<Props> = ({ element }) => {
  return (
    <g>
      <ThemedPolyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        strokeColor={element.strokeColor}
        fillColor="none"
        strokeWidth={1}
      />
    </g>
  );
};

interface Props {
  element: SyntaxTreeLink;
}
