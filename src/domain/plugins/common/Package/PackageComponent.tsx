import React, { SFC } from 'react';
import Package from './Package';

const PackageComponent: SFC<Props> = ({ element, children }) => (
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

export default PackageComponent;
