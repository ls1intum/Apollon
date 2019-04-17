import React, { SFC } from 'react';
import { Package } from './package';

export const PackageComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <path d={`M 0 10 V 0 H 40 V 10`} stroke="black" />
    <rect y="10" width="100%" height={element.bounds.height - 10} stroke="black" />
    <text x="50%" y="15" dy={10} textAnchor="middle" fontWeight="bold">
      {element.name}
    </text>
    {children}
  </g>
);

interface Props {
  element: Package;
}
