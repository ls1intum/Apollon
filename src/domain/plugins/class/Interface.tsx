import React, { SFC } from 'react';
import Element from '../../Element';
import Container from './../../Container';
import Member from './Member';
import Method from './Method';
import Attribute from './Attribute';

const HEADER_HEIGHT = 50;

class Interface extends Container {
  readonly kind: string = 'Interface';

  static isDroppable = false;
  static isResizable: 'BOTH' | 'WIDTH' | 'HEIGHT' | 'NONE' = 'WIDTH';

  deviderPosition: number = 0;

  constructor(public name: string = 'Interface') {
    super(name);
    this.bounds = { ...this.bounds, height: 100 };
  }

  render(elements: Element[]): Element[] {
    let [parent, ...children] = super.render(elements);
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

  addElement(newElement: Element, currentElements: Element[]): Element[] {
    let [parent, ...children] = super.addElement(newElement, currentElements);
    return this.render(children);
  }

  removeElement(
    removedElement: Element,
    currentElements: Element[]
  ): Element[] {
    let [parent, ...children] = super.removeElement(
      removedElement,
      currentElements
    );
    return this.render(children);
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

export const InterfaceComponent: SFC<Props> = ({ element, children }) => {
  return (
    <g>
      <rect width="100%" height="100%" />
      <svg height={HEADER_HEIGHT}>
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontWeight="bold"
        >
          <tspan x="50%" dy={-8} textAnchor="middle" fontSize="85%">
            «interface»
          </tspan>
          <tspan x="50%" dy={18} textAnchor="middle">
            {element.name}
          </tspan>
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
  element: Interface;
}

export default Interface;
