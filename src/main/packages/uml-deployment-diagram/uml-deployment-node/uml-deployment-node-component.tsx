import React, { SFC } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLDeploymentNode } from './uml-deployment-node';

export const UMLDeploymentNodeComponent: SFC<Props> = ({ element, children }) => (
  <g>
    <g>
      <path d={`M 0 8 l 8 -8 H ${element.bounds.width} l -8 8 Z`} stroke={element.color?.stroke || 'black'} />
      <path
        d={`M ${element.bounds.width} 0 V ${element.bounds.height - 8} l -8 8 V 8 Z`}
        stroke={element.color?.stroke || 'black'}
      />
      <rect
        x="0"
        y="8"
        width={element.bounds.width - 8}
        height={element.bounds.height - 9}
        stroke={element.color?.stroke || 'black'}
      />
    </g>
    <Text y="30" fill={element.color?.text}>
      {element.stereotype && (
        <tspan x="50%" dy={-8} textAnchor="middle" fontSize="85%">
          {`«${element.stereotype}»`}
        </tspan>
      )}
      <tspan x="50%" dy={element.stereotype ? 18 : 10} textAnchor="middle">
        {element.name}
      </tspan>
    </Text>
    {children}
  </g>
);

interface Props {
  element: UMLDeploymentNode;
}
