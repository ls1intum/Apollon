import React, { SFC } from 'react';
import Container from './../../Container';

class Package extends Container {
  constructor(public name: string = 'Package') {
    super(name);
  }
}

export const PackageComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <path d={`M 0 10 V 0 H 40 V 10`} fill="#ffffff" stroke="#000000" />
    <rect y="10" width="100%" height={element.bounds.height - 10} stroke="#000000" fill="#ffffff" />
    {children}
  </g>
);

interface Props {
  element: Package;
}

export default Package;
