import React, { SFC } from 'react';
import { DeploymentArtifact } from './deployment-artifact';

export const DeploymentArtifactComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect width="100%" height="100%" stroke="black" />
    <text x="50%" y="28" textAnchor="middle" fontWeight="bold">
      {element.name}
    </text>
    <g transform={`translate(${element.bounds.width - 31}, 7)`}>
    <path d="M 0 0 L 15.95 0 L 23.2 7.25 L 23.2 29 L 0 29 L 0 0 Z" fill="#ffffff" stroke="#000000" strokeWidth="1.45" strokeMiterlimit="10" />
    <path d="M 15.95 0 L 15.95 7.25 L 23.2 7.25" fill="none" stroke="#000000" strokeWidth="1.45" strokeMiterlimit="10" />
    </g>
  </g>
);

interface Props {
  element: DeploymentArtifact;
}
