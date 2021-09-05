import React, { SFC } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLDeploymentArtifact } from './uml-deployment-artifact';

export const UMLDeploymentArtifactComponent: SFC<Props> = ({ element, scale }) => (
  <g>
    <rect width="100%" height="100%" stroke={element.strokeColor || 'black'} />
    <Text y={28 * scale} dominantBaseline="auto" fill={element.textColor}>
      {element.name}
    </Text>
    <g transform={`translate(${element.bounds.width - 26 * scale}, ${7 * scale}) scale(${scale})`}>
      <path
        d="M 0 0 L 13 0 L 19.2 7.25 L 19.2 24 L 0 24 L 0 0 Z"
        fill={element.fillColor || '#ffffff'}
        stroke={element.strokeColor || 'black'}
        strokeWidth="1.2"
        strokeMiterlimit="10"
      />
      <path
        d="M 13 0 L 13 7.25 L 19.2 7.25"
        fill="none"
        stroke={element.strokeColor || 'black'}
        strokeWidth="1.2"
        strokeMiterlimit="10"
      />
    </g>
  </g>
);

interface Props {
  element: UMLDeploymentArtifact;
  scale: number;
}
