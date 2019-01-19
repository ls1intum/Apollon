import React, { SFC } from 'react';
import Container from './../../Container';

class Class extends Container {
  isAbstract: boolean = false;

  constructor(public name: string = 'Class') {
    super(name);
    this.bounds = { ...this.bounds, height: 95 };
  }
}

export const ClassComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect width="100%" height="100%" stroke="black" fill="white" />
    <svg height={35}>
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
    {/* <rect x="0" y={64} width="100%" height="1" fill="black" /> */}
  </g>
);

interface Props {
  element: Class;
}

export default Class;
