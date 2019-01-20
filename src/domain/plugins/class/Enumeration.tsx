import React, { SFC } from 'react';
import Container from './../../Container';

const HEADER_HEIGHT = 50;

class Enumeration extends Container {
  constructor(public name: string = 'Enumeration') {
    super(name);
    this.bounds = { ...this.bounds, height: 140 };
  }
}

export const EnumerationComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <rect width="100%" height="100%" stroke="black" fill="white" />
    <svg height={HEADER_HEIGHT}>
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle">
            <tspan x="50%" dy={-8} textAnchor="middle" fontSize="85%">
              «enumeration»
            </tspan>
            <tspan x="50%" dy={18} textAnchor="middle">
              {element.name}
            </tspan>
      </text>
      <g transform="translate(0, -1)">
        <rect x="0" y="100%" width="100%" height="1" fill="black" />
      </g>
    </svg>
  </g>
);

interface Props {
  element: Enumeration;
}

export default Enumeration;
