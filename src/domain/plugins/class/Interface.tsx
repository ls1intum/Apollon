import React from 'react';
import { Entity, EntityKind, EntityMember } from './../../../core/domain';
import { Point, Size } from '../../../core/geometry';
import Element from './../../Element';
import Member from './/Member';
import { EditorMode } from '../../Options/types';
import styled from 'styled-components';

const EntityNameDisplay: any = styled.tspan`
  overflow: visible;
  user-select: none;
  font-style: ${(props: any) =>
    props.entityKind === EntityKind.AbstractClass ? 'italic' : 'normal'};
`;

const EntityKindDisplay = styled.tspan`
  font-size: 85%;
`;

class Interface extends Element implements Entity {
  kind = EntityKind.Class;
  attributes = [];
  methods = [];
  renderMode = { showAttributes: true, showMethods: true };

  constructor(public name: string, public position: Point, public size: Size) {
    super();
  }

  public render(options: any): JSX.Element {
    const { width, height } = this.bounds;
    const headerHeight = 35 + 14;
    const memberHeight = 25;
    let currentY = headerHeight - memberHeight;
    const entityKindDescription = '«interface»';

    const { editorMode, hover, interactiveElementIds, interactiveElementsMode, theme, toggleInteractiveElements } = options;
    
    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <rect width="100%" height="100%" fill="#ffffff" stroke="#000000" />
        <rect width={width} height={height} stroke="black" fill={
            editorMode === EditorMode.InteractiveElementsView &&
            (hover ||
              interactiveElementIds.has(this.id))
              ? theme.interactiveAreaColor
              : 'white'
          }
        />
        <svg width={width} height={headerHeight}>
          <rect width="100%" height="100%" fill="none" />
          <g transform="translate(0, -1)">
            <rect x="0" y="100%" width="100%" height="1" fill="black" />
          </g>
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle">
            <tspan x="50%" dy={-8} textAnchor="middle" fontSize="85%">
              {entityKindDescription}
            </tspan>
            <tspan x="50%" dy={18} textAnchor="middle">
              {this.name}
            </tspan>
          </text>
        </svg>

        {this.renderMode.showAttributes &&
          this.attributes.map((attribute: EntityMember) => {
            currentY += memberHeight;
            return (
              <Member
                y={currentY}
                key={attribute.id}
                entity={this}
                member={attribute}
                editorMode={editorMode}
                interactiveElementsMode={interactiveElementsMode}
                canBeMadeInteractive={
                  !interactiveElementIds.has(this.id)
                }
                isInteractiveElement={interactiveElementIds.has(attribute.id)}
                onToggleInteractiveElements={() => {
                  toggleInteractiveElements(attribute.id);
                }}
              />
            );
          })
        }

        <rect x="0" y={currentY + memberHeight - 1} width="100%" height="1" fill="black" />

        {this.renderMode.showMethods && 
          this.methods.map((method: EntityMember) => {
            currentY += memberHeight;
            return (
              <Member
                y={currentY}
                key={method.id}
                entity={this}
                member={method}
                editorMode={editorMode}
                interactiveElementsMode={interactiveElementsMode}
                canBeMadeInteractive={
                  !interactiveElementIds.has(this.id)
                }
                isInteractiveElement={interactiveElementIds.has(method.id)}
                onToggleInteractiveElements={() => {
                  toggleInteractiveElements(method.id);
                }}
              />
            );
          })
        }
      </svg>
    );
  }
}

export default Interface;
