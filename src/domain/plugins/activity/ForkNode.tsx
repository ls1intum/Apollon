import React, { SFC } from 'react';
import Element from './../../Element';

class ForkNode extends Element {
  readonly kind: string = 'ForkNode';

  static isEditable = false;

  constructor(public name: string = '') {
    super(name);
    this.bounds = { ...this.bounds, width: 20, height: 60 };
  }
}

export const ForkNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect width="100%" height="100%" stroke="none" fill="black" />
  </g>
);

interface Props {
  element: ForkNode;
}

export default ForkNode;
