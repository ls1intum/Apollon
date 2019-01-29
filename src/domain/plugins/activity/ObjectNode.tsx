import React, { SFC } from 'react';
import Element from './../../Element';

class ObjectNode extends Element {
  constructor(public name: string = 'ObjectNode') {
    super(name);
  }
}

export const ObjectNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect width="100%" height="100%" stroke="black" />
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
  element: ObjectNode;
}

export default ObjectNode;
