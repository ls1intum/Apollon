import React, { SFC } from 'react';
import Element from '../../Element';
import Container from './../../Container';
import Member from './Member';
import Method from './Method';
import Attribute from './Attribute';

const HEADER_HEIGHT = 40;

class Class extends Container {
  readonly kind: string = 'Class';

  static isDroppable = false;
  static isResizable: 'BOTH' | 'WIDTH' | 'HEIGHT' | 'NONE' = 'WIDTH';

  deviderPosition: number = HEADER_HEIGHT + 30;

  constructor(
    public name: string = 'Class',
    public isAbstract: boolean = false
  ) {
    super(name);
    this.bounds = { ...this.bounds, height: 100 };
  }

  addElement(newElement: Element, currentElements: Element[]): Element[] {
    let [parent, ...children] = super.addElement(newElement, currentElements);
    const attributes = children.filter(c => c instanceof Attribute);
    const methods = children.filter(c => c instanceof Method);

    let y = HEADER_HEIGHT;
    for (const child of attributes) {
      child.bounds.y = y;
      child.bounds.width = this.bounds.width;
      y += child.bounds.height;
    }
    this.deviderPosition = y;
    for (const child of methods) {
      child.bounds.y = y;
      child.bounds.width = this.bounds.width;
      y += child.bounds.height;
    }

    parent.bounds.height = y;
    return [parent, ...attributes, ...methods];
  }

  removeElement(
    removedElement: Element,
    currentElements: Element[]
  ): Element[] {
    let [parent, ...children] = super.removeElement(
      removedElement,
      currentElements
    );
    const attributes = children.filter(c => c instanceof Attribute);
    const methods = children.filter(c => c instanceof Method);

    let y = HEADER_HEIGHT;
    for (const child of attributes) {
      child.bounds.y = y;
      y += child.bounds.height;
    }
    this.deviderPosition = y;
    for (const child of methods) {
      child.bounds.y = y;
      y += child.bounds.height;
    }

    parent.bounds.height = y;
    return [parent, ...attributes, ...methods];
  }

  resizeElement(children: Element[]): Element[] {
    const minWidth = children.reduce(
      (width, child) => Math.max(width, Member.calculateWidth(child.name)),
      100
    );
    this.bounds.width = Math.max(this.bounds.width, minWidth);
    return [
      this,
      ...children.map(child => {
        child.bounds.width = this.bounds.width;
        return child;
      }),
    ];
  }
}

export const ClassComponent: SFC<Props> = ({ element, children }) => {
  return (
    <g>
      <rect width="100%" height="100%" />
      <svg height={HEADER_HEIGHT}>
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontStyle={element.isAbstract ? 'italic' : 'normal'}
          fontWeight="bold"
        >
          {element.name}
        </text>
      </svg>
      {children}
      <rect
        width="100%"
        height="100%"
        stroke="black"
        fill="none"
        pointerEvents="none"
      />
      <path
        d={`M 0 ${HEADER_HEIGHT} H ${element.bounds.width}`}
        stroke="black"
      />
      <path
        d={`M 0 ${element.deviderPosition} H ${element.bounds.width}`}
        stroke="black"
      />
    </g>
  );
};

interface Props {
  element: Class;
}

export default Class;
