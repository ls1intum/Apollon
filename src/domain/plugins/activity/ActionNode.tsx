import React from 'react';
import { Point, Size } from '../../../core/geometry';
import Element from './../../Element';
import Boundary from '../../geo/Boundary';
import { EditorMode } from '../../../services/EditorService';

class ActionNode extends Element {
  bounds: Boundary = { ...this.bounds }

  constructor(public name: string = 'ActionNode', public position: Point, public size: Size) {
    super(name);
  }

  public render(options: any): JSX.Element {
    const { width, height } = this.bounds;

    const { editorMode, hover, interactiveElementIds, interactiveElementsMode, theme, toggleInteractiveElements } = options;

    return (
      <svg id={`class-${this.id}`} width={width} height={height} style={{ overflow: 'visible' }}>
        <rect width="100%" height="100%" fill="none" stroke="none" />
        <rect rx={10} ry={10} width={width} height={height} stroke="black" fill={
            editorMode === EditorMode.InteractiveElementsView &&
            (hover ||
              interactiveElementIds.has(this.id))
              ? theme.interactiveAreaColor
              : 'white'
          }
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle">{this.name}</text>
      </svg>
    );
  }
}

export default ActionNode;
