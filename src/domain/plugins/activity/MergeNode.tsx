import React from 'react';
import { Point, Size } from '../../../core/geometry';
import Element from './../../Element';
import Boundary from '../../geo/Boundary';
import { EditorMode } from '../../../services/EditorService';

class MergeNode extends Element {
  bounds: Boundary = { ...this.bounds, height: 60 }

  constructor(public name: string = 'ActionNode', public position: Point, public size: Size) {
    super(name);
  }

  public render(options: any): JSX.Element {
    const { width, height } = this.bounds;

    const { editorMode, hover, interactiveElementIds, interactiveElementsMode, theme, toggleInteractiveElements } = options;

    return (
      <svg id={`class-${this.id}`} width={width} height={height} style={{ overflow: 'visible' }}>
        <rect width="100%" height="100%" fill="none" stroke="none" />
        <polyline points={`${width / 2} 0, ${width} ${height / 2}, ${width / 2} ${height}, 0 ${height / 2}, ${width / 2} 0`} stroke="black" fill={
            editorMode === EditorMode.InteractiveElementsView &&
            (hover ||
              interactiveElementIds.has(this.id))
              ? theme.interactiveAreaColor
              : 'white'
          }
        />
      </svg>
    );
  }
}

export default MergeNode;
