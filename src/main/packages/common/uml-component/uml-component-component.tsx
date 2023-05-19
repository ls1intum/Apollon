import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLComponent } from './uml-component';
import { ThemedPath, ThemedRect } from '../../../components/theme/themedComponents';
 
export const UMLComponentComponent: FunctionComponent<Props> = ({ element, children, scale, fillColor }) => (
  <g data-cy="uml-component">
    <ThemedRect
      width="100%"
      height="100%"
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
    />
    <g transform={`translate(${element.bounds.width - 31 * scale}, ${7 * scale})`}>
      <ThemedPath
        style={{ transform: `scale(${scale})` }}
        d="M 4.8 0 L 24 0 L 24 24 L 4.8 24 L 4.8 19.2 L 0 19.2 L 0 14.4 L 4.8 14.4 L 4.8 9.6 L 0 9.6 L 0 4.8 L 4.8 4.8 Z"
        fillColor={fillColor || element.fillColor}
        strokeColor={element.strokeColor}
        strokeWidth="1.2"
        strokeMiterlimit="10"
      />
      <ThemedPath
        style={{ transform: `scale(${scale})` }}
        d="M 4.8 4.8 L 9.6 4.8 L 9.6 9.6 L 4.8 9.6 M 4.8 14.4 L 9.6 14.4 L 9.6 19.2 L 4.8 19.2"
        fillColor="none"
        strokeColor={element.strokeColor}
        strokeWidth="1.2"
        strokeMiterlimit="10"
      />
    </g>
    <Text fill={element.textColor}>
      {element.stereotype && (
        <tspan x="50%" dy={-8 * scale} textAnchor="middle" fontSize="85%">
          {`«${element.stereotype}»`}
        </tspan>
      )}
      <tspan x="50%" dy={element.stereotype ? 18 * scale : 10 * scale} textAnchor="middle">
        {element.name}
      </tspan>
    </Text>
    {children}
  </g>
);

interface Props {
  element: UMLComponent;
  scale: number;
  fillColor?: string;
  children?: React.ReactNode;
}
