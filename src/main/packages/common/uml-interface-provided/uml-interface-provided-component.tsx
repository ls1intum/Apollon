import React, { FunctionComponent } from 'react';
import { UMLInterfaceProvided } from './uml-interface-provided';
import { ThemedPolyline } from '../../../components/theme/themedComponents';

export const UMLInterfaceProvidedComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <ThemedPolyline
      points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
      strokeColor={element.strokeColor}
      fillColor="none"
    />
  </g>
);

interface Props {
  element: UMLInterfaceProvided;
}
