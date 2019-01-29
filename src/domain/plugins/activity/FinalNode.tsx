import React, { SFC } from 'react';
import Element from './../../Element';

class FinalNode extends Element {
  readonly kind: string = 'FinalNode';

  static isEditable = false;

  constructor(public name: string = '') {
    super(name);
    this.bounds = { ...this.bounds, width: 45, height: 45 };
  }
}

export const FinalNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <circle
      cx="50%"
      cy="50%"
      r={Math.min(element.bounds.width, element.bounds.height) / 2 - 2.5}
      stroke="black"
      strokeWidth="5"
    />
    <circle
      cx="50%"
      cy="50%"
      r={Math.min(element.bounds.width, element.bounds.height) / 2 - 7.5}
      stroke="none"
      fill="black"
    />
  </g>
);

interface Props {
  element: FinalNode;
}

export default FinalNode;
