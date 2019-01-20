import React, { SFC } from 'react';
import Element from '../../Element';
import Container from './../../Container';
import Method from './Method';
import Attribute from './Attribute';

const HEADER_HEIGHT = 50;

class Interface extends Container {
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
    y += 1;
    for (const child of methods) {
      child.bounds.y = y;
      y += child.bounds.height;
    }

    parent.bounds.height = y;
    return [parent, ...children];
  }
}

export const InterfaceComponent: SFC<Props> = ({ element, children }) => {
  return (
    <g>
      <rect width="100%" height="100%" stroke="black" fill="white" />
      <svg height={HEADER_HEIGHT}>
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle">
          <tspan x="50%" dy={-8} textAnchor="middle" fontSize="85%">
            «interface»
          </tspan>
          <tspan x="50%" dy={18} textAnchor="middle">
            {element.name}
          </tspan>
        </text>
        <g transform="translate(0, -1)">
          <rect x="0" y="100%" width="100%" height="1" fill="black" />
        </g>
      </svg>
      {children}
      <rect
        x="0"
        y={element.deviderPosition}
        width="100%"
        height="1"
        fill="black"
      />
    </g>
  );
};

interface Props {
  element: Interface;
}

export default Interface;
