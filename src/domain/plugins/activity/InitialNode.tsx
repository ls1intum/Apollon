import React from 'react';
import { Point, Size } from '../../geo';
import Element from './../../Element';
import Boundary from '../../geo/Boundary';
import { EditorMode } from '../../../services/EditorService';

class InitialNode extends Element {
  bounds: Boundary = { ...this.bounds, width: 45, height: 45 }

  constructor(public name: string = 'ActionNode', public position: Point, public size: Size) {
    super(name);
  }

  public render(options: any): JSX.Element {
    const { width, height } = { ...this.bounds };

    const { editorMode, hover, interactiveElementIds, interactiveElementsMode, theme, toggleInteractiveElements } = options;

    return (
      <svg id={`class-${this.id}`} width={width} height={height} style={{ overflow: 'visible' }}>
        <rect width="100%" height="100%" fill="none" stroke="none" />
        <circle cx={width / 2} cy={height / 2} r={Math.min(width, height) / 2} stroke="none" fill={
            editorMode === EditorMode.InteractiveElementsView &&
            (hover ||
              interactiveElementIds.has(this.id))
              ? theme.interactiveAreaColor
              : 'black'
          }
        />
      </svg>
    );
  }
}

export default InitialNode;
