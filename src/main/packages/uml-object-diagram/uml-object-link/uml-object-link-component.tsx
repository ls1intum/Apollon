import React, { FunctionComponent } from 'react';
import { UMLObjectLink } from './uml-object-link';
import { ThemedPolyline } from '../../../components/theme/themedComponents';

export const UMLObjectLinkComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <ThemedPolyline
      points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
      strokeColor={element.strokeColor}
      fillColor="none"
      strokeWidth={1}
    />
  </g>
);

interface Props {
  element: UMLObjectLink;
}
