import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLDeploymentNode } from './uml-deployment-node';
import { ThemedPath, ThemedRect } from '../../../components/theme/themedComponents';

export const UMLDeploymentNodeComponent: FunctionComponent<Props> = ({ element, children, scale, fillColor }) => (
  <g>
    <g>
      <ThemedPath
        d={`M 0 ${8 * scale} l ${8 * scale} -${8 * scale} H ${element.bounds.width} l -${8 * scale} ${8 * scale} Z`}
        strokeColor={element.strokeColor}
        fillColor={fillColor || element.fillColor}
      />
      <ThemedPath
        d={`M ${element.bounds.width} 0 V ${element.bounds.height - 8 * scale} l -${8 * scale} ${8 * scale} V ${
          8 * scale
        } Z`}
        strokeColor={element.strokeColor}
        fillColor={fillColor || element.fillColor}
      />
      <ThemedRect
        x="0"
        y={8 * scale}
        width={element.bounds.width - 8 * scale}
        height={element.bounds.height - 9 * scale}
        strokeColor={element.strokeColor}
        fillColor={fillColor || element.fillColor}
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
  fillColor?: string;
  children?: React.ReactNode;
}
