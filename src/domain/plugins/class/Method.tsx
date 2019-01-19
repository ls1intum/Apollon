import React, { SFC } from 'react';
import Element from './../../Element';

class Method extends Element {
  constructor(public name: string = ' + method()') {
    super(name);
    this.bounds = { ...this.bounds, height: 30 };
  }
}

export const MethodComponent: SFC<Props> = ({ element }) => (
  <g>
    <text x={20} y="50%" dominantBaseline="middle">
      {element.name}
    </text>
  </g>
);

interface Props {
  element: Method;
}

export default Method;
