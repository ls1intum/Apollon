import React, { Component } from 'react';
import { DeepPartial } from 'redux';
import { UMLElementState } from '../../services/uml-element/uml-element-types';
import { hoverable } from '../layouted-element/hoverable';
import { ModelState } from '../store/model-state';
import { ModelStore } from '../store/model-store';
import { styled } from '../theme/styles';
import { CanvasElement } from '../uml-element/canvas-element';

type OwnProps = {
  elements?: UMLElementState;
};

const StyledPreview = styled(hoverable(CanvasElement))`
  margin: 5px;
  overflow: visible;
`;

export class Preview extends Component<OwnProps> {
  render() {
    const { elements } = this.props;

    if (!elements || !Object.keys(elements).length) {
      return null;
    }

    const state: DeepPartial<ModelState> = { elements };
    const id = Object.keys(elements)[0];

    return (
      <StyledPreview id={id} />
    );
  }
}
