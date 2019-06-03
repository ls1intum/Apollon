import React, { Component, createRef, RefObject } from 'react';
import { connect } from 'react-redux';
import { IUMLDiagram } from '../../services/uml-diagram/uml-diagram';
import { Point } from '../../utils/geometry/point';
import { Droppable } from '../draggable/droppable';
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

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  state => ({
    diagram: state.diagram,
  }),
  null,
  null,
  { forwardRef: true },
);

export class CanvasComponent extends Component<Props> implements CoordinateSystem {
  canvas: RefObject<SVGSVGElement> = createRef();

  origin = (): Point => {
    const canvasBounds = this.canvas.current!.getBoundingClientRect();
    return new Point(canvasBounds.left + canvasBounds.width / 2, canvasBounds.top + canvasBounds.height / 2);
  }

  snap = (point: Point): Point => {
    const origin = this.origin();
    return point
      .subtract(origin)
      .round()
      .add(origin);
  }

  componentDidMount() {
    this.forceUpdate();
  }

  render() {
    const { diagram } = this.props;

    return (
      <Droppable>
        <CanvasContainer width={diagram.bounds.width} height={diagram.bounds.height} ref={this.canvas}>
          {this.canvas.current && (
            <circle cx={this.center().x} cy={this.center().y} r={10} fill="green" fillOpacity={0.5} />
          )}
          <svg x="50%" y="50%">
            <rect
              x={-diagram.bounds.width / 2}
              y={-diagram.bounds.height / 2}
              width={diagram.bounds.width}
              height={diagram.bounds.height}
              fill="green"
              fillOpacity={0.1}
            />
            {diagram.ownedElements.map(element => (
              <UMLElementComponent key={element} id={element} component="canvas" />
            ))}
            {diagram.ownedRelationships.map(relationship => (
              <LayoutedRelationship key={relationship} relationship={relationship} />
            ))}
            <ConnectionPreview />
          </svg>
        </CanvasContainer>
      </Droppable>
    );
  }

  private center(): Point {
    const canvasBounds = this.canvas.current!.getBoundingClientRect();
    return new Point(canvasBounds.width / 2, canvasBounds.height / 2);
  }
}

export const Canvas = enhance(CanvasComponent);
