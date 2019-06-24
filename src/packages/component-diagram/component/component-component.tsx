import React, { SFC } from 'react';
import { Component } from './component';

export const ComponentComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <rect width="100%" height="100%" stroke="black" />
    <text x="50%" y="25px" textAnchor="middle" fontWeight="bold">
      {element.name}
    </text>
    <g transform={`translate(${element.bounds.width - 31}, 7)`}>
      <path d="M 4.8 0 L 24 0 L 24 24 L 4.8 24 L 4.8 19.2 L 0 19.2 L 0 14.4 L 4.8 14.4 L 4.8 9.6 L 0 9.6 L 0 4.8 L 4.8 4.8 Z" fill="#ffffff" stroke="#000000" strokeWidth="1.2" strokeMiterlimit="10" />
      <path d="M 4.8 4.8 L 9.6 4.8 L 9.6 9.6 L 4.8 9.6 M 4.8 14.4 L 9.6 14.4 L 9.6 19.2 L 4.8 19.2" fill="none" stroke="#000000" strokeWidth="1.2" strokeMiterlimit="10" />
    </g>
    {children}
  </g>
);

interface Props {
  element: Component;
}
