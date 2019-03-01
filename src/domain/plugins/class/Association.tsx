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

export const AssociationComponent: SFC<Props> = ({ element, path }) => (
  <polyline
    points={path.map(point => `${point.x} ${point.y}`).join(',')}
    stroke="black"
    fill="none"
    strokeWidth={1}
  />
);

interface Props {
  element: Association;
  path: { x: number; y: number }[];
}

export default Association;
