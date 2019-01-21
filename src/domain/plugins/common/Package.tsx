import React, { SFC } from 'react';
import Container from './../../Container';

class Package extends Container {
  static isConnectable = false;
  static isEditable = false;

  constructor(public name: string = 'Package') {
    super(name);
  }
}

export const PackageComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <path d={`M 0 10 V 0 H 40 V 10`} stroke="black" />
    <rect
      y="10"
      width="100%"
      height={element.bounds.height - 10}
      stroke="black"
    />
    {children}
  </g>
);

interface Props {
  element: Package;
}

export default Package;
