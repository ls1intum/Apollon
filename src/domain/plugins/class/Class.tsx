import React, { SFC } from 'react';
import Element from '../../Element';
import Container from './../../Container';
import Method from './Method';
import Attribute from './Attribute';

const HEADER_HEIGHT = 40;

class Class extends Container {
  deviderPosition: number = HEADER_HEIGHT + 30;

  constructor(public name: string = 'Class', public isAbstract: boolean = false) {
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

export const ClassComponent: SFC<Props> = ({ element, children }) => {
  return (
    <g>
      <rect width="100%" height="100%" stroke="black" fill="white" />
      <svg height={HEADER_HEIGHT}>
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontStyle={element.isAbstract ? 'italic' : 'normal'}
        >
          {element.name}
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
  element: Class;
}

export default Class;
