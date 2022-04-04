import React, { FunctionComponent } from 'react';
import { UMLClassPackage } from './uml-class-package';
import { ThemedRect, ThemedPath } from '../../../components/theme/themedComponents';

export const UMLClassPackageComponent: FunctionComponent<Props> = ({ element, children, scale }) => (
  <g>
    <ThemedPath style={{ transform: `scale(${scale})` }} d={`M 0 10 V 0 H 40 V 10`} strokeColor={element.strokeColor} />
    <ThemedRect
      y={10 * scale}
      width="100%"
      height={element.bounds.height - 10 * scale}
      strokeColor={element.strokeColor}
    />
    <text
      x="50%"
      y={20 * scale}
      dy={10 * scale}
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
  scale: number;
}
