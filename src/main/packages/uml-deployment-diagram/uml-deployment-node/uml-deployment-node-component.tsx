import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text.js';
import { UMLDeploymentNode } from './uml-deployment-node.js';

export const UMLDeploymentNodeComponent: FunctionComponent<Props> = ({ element, children, scale }) => (
  <g>
    <g>
      <path
        d={`M 0 ${8 * scale} l ${8 * scale} -${8 * scale} H ${element.bounds.width} l -${8 * scale} ${8 * scale} Z`}
        stroke={element.strokeColor || 'black'}
      />
      <path
        d={`M ${element.bounds.width} 0 V ${element.bounds.height - 8 * scale} l -${8 * scale} ${8 * scale} V ${
          8 * scale
        } Z`}
        stroke={element.strokeColor || 'black'}
      />
      <rect
        x="0"
        y={8 * scale}
        width={element.bounds.width - 8 * scale}
        height={element.bounds.height - 9 * scale}
        stroke={element.strokeColor || 'black'}
      />
    </g>
    <Text y={30 * scale} fill={element.textColor}>
      {element.stereotype && (
        <tspan x="50%" dy={-8 * scale} textAnchor="middle" fontSize="85%">
          {`«${element.stereotype}»`}
        </tspan>
      )}
      <tspan x="50%" dy={element.stereotype ? 18 * scale : 10 * scale} textDecoration="underline" textAnchor="middle">
        {element.name}
      </tspan>
    </Text>
    {children}
  </g>
);

interface Props {
  element: UMLDeploymentNode;
  scale: number;
}
