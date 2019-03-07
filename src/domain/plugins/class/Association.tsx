import React, { SFC } from 'react';
import Relationship from '../../Relationship';
import Port from '../../Port';
import { RelationshipKindMarker } from '../../../rendering/renderers/svg/defs/RelationshipMarkers';
import RelationshipLabels from './RelationshipLabels';

abstract class Association extends Relationship {
  readonly kind: string = 'Association';

  constructor(name: string, source: Port, target: Port) {
    super(name, source, target);
  }
}

export const AssociationComponent = (
  marker: RelationshipKindMarker | null,
  dashed = false
): SFC<Props> => ({ element, path }) => (
  <g>
    <RelationshipLabels
      relationship={element}
      relationshipPath={path}
    />
    <polyline
      points={path.map(point => `${point.x} ${point.y}`).join(',')}
      stroke="black"
      fill="none"
      strokeWidth={1}
      markerEnd={marker ? `url(#${marker})` : undefined}
      strokeDasharray={dashed ? '7, 7' : undefined}
    />
  </g>
);

interface Props {
  element: Association;
  path: { x: number; y: number }[];
}

export default Association;
