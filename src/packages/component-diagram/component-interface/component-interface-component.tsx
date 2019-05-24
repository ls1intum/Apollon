import React, { SFC } from 'react';
import { ComponentInterface } from './component-interface';

export const ComponentInterfaceComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <circle
      cx="50%"
      cy="50%"
      r={Math.min(element.bounds.width, element.bounds.height) / 2}
      stroke="black"
      strokeWidth={2}
      fill="none"
    />
    <text x="100%" y="0%" fontWeight="bold">
      {element.name}
    </text>
  </g>
);

interface Props {
  element: ComponentInterface;
}
