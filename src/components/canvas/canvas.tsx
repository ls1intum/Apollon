import React, { Component, createRef, RefObject } from 'react';
import { connect } from 'react-redux';
import { IUMLDiagram } from '../../services/uml-diagram/uml-diagram';
import { LayoutedRelationship } from '../layouted-relationship/layouted-relationship';
import { ModelState } from '../store/model-state';
import { ConnectionPreview } from './../connectable/connection-preview';
import { UMLElementComponent } from './../uml-element/uml-element-component';
import { CanvasContainer } from './canvas-styles';
import { CoordinateSystem } from './coordinate-system';

type OwnProps = {};

type StateProps = {
  diagram: IUMLDiagram;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(state => ({
  diagram: state.diagram,
}));

class CanvasComponent extends Component<Props> {
  layer: RefObject<SVGSVGElement> = createRef();
  coordinateSystem = new CoordinateSystem(this.layer);

  render() {
    const { diagram } = this.props;

    return (
      <CanvasContainer width={diagram.bounds.width / 2 + 20} height={diagram.bounds.height / 2 + 20} ref={this.layer}>
        <rect x={-diagram.bounds.width / 2} y={-diagram.bounds.height / 2} width={diagram.bounds.width} height={diagram.bounds.height} fill="green" fillOpacity={0.1} />
        {diagram.ownedElements.map(element => (
          <UMLElementComponent key={element} id={element} component="canvas" />
        ))}
        {diagram.ownedRelationships.map(relationship => (
          <LayoutedRelationship key={relationship} relationship={relationship} />
        ))}
        <ConnectionPreview coordinateSystem={this.coordinateSystem} />
      </CanvasContainer>
    );
  }
}

export const Canvas = enhance(CanvasComponent);
