import React, { FunctionComponent } from 'react';
import { UMLClassPackage } from './uml-class-package';
import { ThemedPath, ThemedRect } from '../../../components/theme/themedComponents';

export const UMLClassPackageComponent: FunctionComponent<Props> = ({ element, children, fillColor }) => (
  <g>
    <ThemedPath
      d={`M 0 10 V 0 H 40 V 10`}
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
    />
    <ThemedRect
      y={10}
      width="100%"
      height={element.bounds.height - 10}
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
    />
    <text
      x="50%"
      y={20}
      dy={10}
      textAnchor="middle"
      fontWeight="bold"
      pointerEvents="none"
      style={element.textColor ? { fill: element.textColor } : {}}
    >
      {element.name}
    </text>
    {children}
  </g>
);

interface Props {
  element: UMLClassPackage;
  fillColor?: string;
  children?: React.ReactNode;
}
