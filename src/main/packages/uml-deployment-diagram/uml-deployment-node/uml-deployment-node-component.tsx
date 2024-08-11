import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLDeploymentNode } from './uml-deployment-node';
import { ThemedPath, ThemedRect } from '../../../components/theme/themedComponents';

export const UMLDeploymentNodeComponent: FunctionComponent<Props> = ({ element, children, fillColor }) => (
  <g>
    <g>
      <ThemedPath
        d={`M 0 ${8} l ${8} -${8} H ${element.bounds.width} l -${8} ${8} Z`}
        strokeColor={element.strokeColor}
        fillColor={fillColor || element.fillColor}
      />
      <ThemedPath
        d={`M ${element.bounds.width} 0 V ${element.bounds.height - 8} l -${8} ${8} V ${8} Z`}
        strokeColor={element.strokeColor}
        fillColor={fillColor || element.fillColor}
      />
      <ThemedRect
        x="0"
        y={8}
        width={element.bounds.width - 8}
        height={element.bounds.height - 9}
        strokeColor={element.strokeColor}
        fillColor={fillColor || element.fillColor}
      />
    </g>
    <Text y={30} fill={element.textColor}>
      {element.stereotype && element.displayStereotype && (
        <tspan x="50%" dy={-8} textAnchor="middle" fontSize="85%">
          {`«${element.stereotype}»`}
        </tspan>
      )}
      <tspan
        x="50%"
        dy={element.stereotype && element.displayStereotype ? 18 : 0}
        textDecoration="underline"
        textAnchor="middle"
      >
        {element.name}
      </tspan>
    </Text>
    {children}
  </g>
);

interface Props {
  element: UMLDeploymentNode;
  fillColor?: string;
  children?: React.ReactNode;
}
