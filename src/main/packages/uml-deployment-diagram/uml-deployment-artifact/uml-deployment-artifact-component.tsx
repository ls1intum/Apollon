import React, { SFC } from 'react';
import { UMLDeploymentArtifact } from './uml-deployment-artifact';

export const UMLDeploymentArtifactComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect width="100%" height="100%" stroke={element.color?.stroke || 'black'} />
    <text x="50%" y="28" textAnchor="middle" fontWeight="bold" pointerEvents="none">
      {element.name}
    </text>
    <g transform={`translate(${element.bounds.width - 26}, 7)`}>
      <path
        d="M 0 0 L 13 0 L 19.2 7.25 L 19.2 24 L 0 24 L 0 0 Z"
        fill="#ffffff"
        stroke={element.color?.stroke || 'black'}
        strokeWidth="1.2"
        strokeMiterlimit="10"
      />
      <path
        d="M 13 0 L 13 7.25 L 19.2 7.25"
        fill="none"
        stroke={element.color?.stroke || 'black'}
        strokeWidth="1.2"
        strokeMiterlimit="10"
      />
    </g>
  </g>
);

interface Props {
  element: UMLDeploymentArtifact;
}
