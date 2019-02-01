import React, { SFC } from 'react';
import Element from './../../Element';

class InitialNode extends Element {
  readonly kind: string = 'InitialNode';

  static isEditable = false;

  constructor(public name: string = '') {
    super(name);
    this.bounds = { ...this.bounds, width: 45, height: 45 };
  }
}

export const InitialNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <circle
      cx="50%"
      cy="50%"
      r={Math.min(element.bounds.width, element.bounds.height) / 2}
      stroke="none"
      fill="black"
    />
  </g>
);

interface Props {
  element: InitialNode;
}

export default InitialNode;
