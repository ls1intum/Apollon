import React, { SFC } from 'react';
import ObjectAttribute from './ObjectAttribute';

const ObjectAttributeComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect
      x={1}
      y={1}
      width={element.bounds.width - 2}
      height={element.bounds.height - 2}
    />
    <text x={10} y="50%" dominantBaseline="middle">
      {element.name}
    </text>
  </g>
);

interface Props {
  element: ObjectAttribute;
}

export default ObjectAttributeComponent;
