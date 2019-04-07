import React, { SFC } from 'react';
import { CommunicationLink } from './communication-link';

export const CommunicationLinkComponent: SFC<Props> = ({ element }) => (
  <g>
    <polyline points={element.path.map(point => `${point.x} ${point.y}`).join(',')} stroke="black" fill="none" strokeWidth={1} />
  </g>
);

interface Props {
  element: CommunicationLink;
}
