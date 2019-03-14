import React, { SFC } from 'react';
import Class from './Class';

const ClassComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <rect width="100%" height="100%" />
    {element.isInterface || element.isEnumeration ? (
      <svg height={element.headerHeight}>
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontWeight="bold"
        >
          <tspan x="50%" dy={-8} textAnchor="middle" fontSize="85%">
            {element.isInterface && '«interface»'}
            {element.isEnumeration && '«enumeration»'}
          </tspan>
          <tspan x="50%" dy={18} textAnchor="middle">
            {element.name}
          </tspan>
        </text>
      </svg>
    ) : (
      <svg height={element.headerHeight}>
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontStyle={element.isAbstract ? 'italic' : 'normal'}
          fontWeight="bold"
        >
          {element.name}
        </text>
      </svg>
    )}
    {children}
    <rect
      width="100%"
      height="100%"
      stroke="black"
      fill="none"
      pointerEvents="none"
    />
    <path
      d={`M 0 ${element.headerHeight} H ${element.bounds.width}`}
      stroke="black"
    />
    <path
      d={`M 0 ${element.deviderPosition} H ${element.bounds.width}`}
      stroke="black"
    />
  </g>
);

interface Props {
  element: Class;
}

export default ClassComponent;
