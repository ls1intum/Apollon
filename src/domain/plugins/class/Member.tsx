import React, { SFC } from 'react';
import Element from './../../Element';

class Member extends Element {
  static isHoverable = false;
  static isSelectable = false;
  static isMovable = false;
  static isResizable = false;
  static isConnectable = false;

  constructor(public name: string = '') {
    super(name);
    this.bounds = { ...this.bounds, height: 30 };
  }
}

export const MemberComponent: SFC<Props> = ({ element }) => (
  <g>
    <text x={20} y="50%" dominantBaseline="middle">
      {element.name}
    </text>
  </g>
);

interface Props {
  element: Member;
}

export default Member;
