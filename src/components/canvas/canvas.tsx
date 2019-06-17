import React, { Component, createRef, RefObject } from 'react';
import { connect } from 'react-redux';
import { ILayer } from '../../services/layouter/layer';
import { IUMLDiagram } from '../../services/uml-diagram/uml-diagram';
import { Point } from '../../utils/geometry/point';
import { Droppable } from '../draggable/droppable';
import { LayoutedRelationship } from '../layouted-relationship/layouted-relationship';
import { ModelState } from '../store/model-state';
import { ConnectionPreview } from './../connectable/connection-preview';
import { UMLElementComponent } from './../uml-element/uml-element-component';
import { CanvasContainer } from './canvas-styles';

type OwnProps = {};

type StateProps = {
  diagram: IUMLDiagram;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  state => ({
    diagram: state.diagram,
  }),
  null,
  null,
  { forwardRef: true },
);

export class CanvasComponent extends Component<Props> implements Omit<ILayer, 'layer'> {
  layer: RefObject<SVGSVGElement> = createRef();

  origin = (): Point => {
    if (!this.layer.current) {
      return new Point();
    }
    const canvasBounds = this.layer.current.getBoundingClientRect();

    return new Point(canvasBounds.left + canvasBounds.width / 2, canvasBounds.top + canvasBounds.height / 2);
  };

  snap = (point: Point): Point => {
    const origin = this.origin();

    return point
      .subtract(origin)
      .round()
      .add(origin);
  };

  render() {
    console.log('Canvas#render', this.layer.current);
    const { diagram } = this.props;

    return (
      <Droppable>
        <CanvasContainer width={diagram.bounds.width} height={diagram.bounds.height} ref={this.layer}>
          {this.layer.current && (
            <>
              <svg x="50%" y="50%">
                {/* TODO: delete */}
                <circle cx={0} cy={0} r={5} fill="green" fillOpacity={0.5} />
                <rect
                  x={-diagram.bounds.width / 2}
                  y={-diagram.bounds.height / 2}
                  width={diagram.bounds.width}
                  height={diagram.bounds.height}
                  fill="green"
                  fillOpacity={0.1}
                />
                {/* end delete */}
                {diagram.ownedElements.map(element => (
                  <UMLElementComponent key={element} id={element} component="canvas" />
                ))}
                {diagram.ownedRelationships.map(relationship => (
                  <LayoutedRelationship key={relationship} relationship={relationship} />
                ))}
                <ConnectionPreview />
              </svg>
            </>
          )}
        </CanvasContainer>
      </Droppable>
    );
  }
}

export const Canvas = enhance(CanvasComponent);
