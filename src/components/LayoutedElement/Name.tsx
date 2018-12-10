import React, { Component } from 'react';
import styled from 'styled-components';
import { Entity, EntityKind } from './../../core/domain';
import {
  computeEntityHeaderHeight,
  getEntityKindDescriptionOrNull,
} from './../../rendering/layouters/entity';

const EntityNameDisplay: any = styled.tspan`
  overflow: visible;
  user-select: none;
  font-style: ${(props: any) =>
    props.entityKind === EntityKind.AbstractClass ? 'italic' : 'normal'};
`;

const EntityKindDisplay = styled.tspan`
  font-size: 85%;
`;

class Name extends Component<Props> {
  render() {
    const { entity } = this.props;
    const { width } = entity.bounds;
    const height = computeEntityHeaderHeight(entity.kind);
    const entityKindDescription = getEntityKindDescriptionOrNull(entity.kind);

    return (
      <svg
        x="0"
        y="0"
        height={height}
        width={width}
        fill="black"
        style={{ overflow: 'visible' }}
      >
        <rect x="0" y="100%" width="100%" height="1" fill="black" />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle">
          {entityKindDescription && (
            <EntityKindDisplay
              x="50%"
              dy={entityKindDescription ? -8 : 0}
              textAnchor="middle"
            >
              {entityKindDescription}
            </EntityKindDisplay>
          )}
          <EntityNameDisplay
            x="50%"
            dy={entityKindDescription ? 16 : 2}
            textAnchor="middle"
            entityKind={entity.kind}
          >
            {entity.name}
          </EntityNameDisplay>
          <path d={`M 0 ${height} H ${width}`} stroke="#000000" />
        </text>
      </svg>
    );
  }
}

interface Props {
  entity: Entity;
}

export default Name;
