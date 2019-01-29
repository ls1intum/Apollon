import React, { SFC } from 'react';
import Element from './../../Element';

class MergeNode extends Element {
  constructor(public name: string = 'Condition') {
    super(name);
    this.bounds = { ...this.bounds, height: 60 };
  }
}

export const MergeNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <polyline
      points={`${element.bounds.width / 2} 0, ${element.bounds.width} ${element
        .bounds.height / 2}, ${element.bounds.width / 2} ${
        element.bounds.height
      }, 0 ${element.bounds.height / 2}, ${element.bounds.width / 2} 0`}
      stroke="black"
    />
    <text
      x="50%"
      y="50%"
      dominantBaseline="middle"
      textAnchor="middle"
      fontWeight="bold"
    >
      {element.name}
    </text>
  </g>
);

interface Props {
  element: MergeNode;
}

export default MergeNode;
