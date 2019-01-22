import React, { SFC } from 'react';
import Element from '../../Element';
import Container from './../../Container';
import Method from './Method';
import Attribute from './Attribute';

const HEADER_HEIGHT = 50;

class Interface extends Container {
  static isDroppable = false;

  deviderPosition: number = 0;

  constructor(public name: string = 'Interface') {
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
      y += child.bounds.height;
    }
    this.deviderPosition = y;
    for (const child of methods) {
      child.bounds.y = y;
      y += child.bounds.height;
    }

    parent.bounds.height = y;
    return [parent, ...children];
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
}

export const InterfaceComponent: SFC<Props> = ({ element, children }) => {
  return (
    <g>
      <rect width="100%" height="100%" />
      <svg height={HEADER_HEIGHT}>
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle">
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
