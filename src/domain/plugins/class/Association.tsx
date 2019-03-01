import React, { SFC } from 'react';
import Relationship from '../../Relationship';
import { CanvasConsumer } from '../../../components/Canvas/CanvasContext';
import Port from '../../Port';

class Association extends Relationship {
  readonly kind: string = 'Association';

  constructor(name: string, source: Port, target: Port) {
    super(name, source, target);
  }
}

export const AssociationComponent: SFC<Props> = ({ element }) => (
  <CanvasConsumer
    children={context => {
      const path =
        (context &&
          element.path
            .map(point =>
              context.coordinateSystem.pointToScreen(point.x, point.y)
            )
            .map(point => `${point.x} ${point.y}`)
            .join(',')) ||
        '';
      return (
        <polyline points={path} stroke="black" fill="none" strokeWidth={1} />
      );
    }}
  />
);

interface Props {
  element: Association;
}

export default Association;
