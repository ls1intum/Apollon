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

  static calculateWidth = (value: string): number => {
    const root = document.body.getElementsByClassName('apollon-editor')[0];
    if (!root) return 0;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.visibility = 'none';
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.appendChild(document.createTextNode(value));
    svg.appendChild(text);
    
    root.appendChild(svg);
    const width = text.getComputedTextLength();
    root.removeChild(svg);
    return width + 2 * 10;
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
