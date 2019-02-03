import React, { SFC } from 'react';
import Element from './../../Element';

abstract class Member extends Element {
  static isHoverable = false;
  static isSelectable = false;
  static isMovable = false;
  static isResizable: 'BOTH' | 'WIDTH' | 'HEIGHT' | 'NONE' = 'NONE';
  static isConnectable = false;
  static isDroppable = false;
  static isEditable = false;

  constructor(public name: string = '') {
    super(name);
    this.bounds = { ...this.bounds, height: 30 };
  }
}

export const MemberComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect x={1} y={1} width={element.bounds.width - 2} height={element.bounds.height - 2} />
    <text x={10} y="50%" dominantBaseline="middle">
      {element.name}
    </text>
  </g>
);

interface Props {
  element: Member;
}

export default Member;
