import React, { Component, ComponentType, createRef, LegacyRef, RefObject } from 'react';
import { connect, ConnectedComponent } from 'react-redux';
import { ILayer } from '../../services/layouter/layer';
import { IUMLDiagram } from '../../services/uml-diagram/uml-diagram';
import { Point } from '../../utils/geometry/point';
import { Droppable } from '../draggable/droppable';
import { ModelState } from '../store/model-state';
import { ConnectionPreview } from '../connectable/connection-preview';
import { UMLElementComponent } from '../uml-element/uml-element-component';
import { CanvasContainer } from './canvas-styles';
import { UMLElementState } from '../../services/uml-element/uml-element-types';
import { UMLRelationship } from '../../services/uml-relationship/uml-relationship';

type OwnProps = {};

type StateProps = {
  diagram: IUMLDiagram;
  isStatic: boolean;
  elements: UMLElementState;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state) => ({
    diagram: state.diagram,
    isStatic: state.editor.readonly,
    elements: state.elements,
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

    return point.subtract(origin).round().add(origin);
  };

  render() {
    const { elements, diagram, isStatic } = this.props;

    let minX = 0;
    let minY = 0;

    if (isStatic) {
      for (const element of Object.values(elements)) {
        if (UMLRelationship.isUMLRelationship(element)) {
          for (const p of element.path) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
          }
        }
      }
      minX = Math.abs(Math.round(minX));
      minY = Math.abs(Math.round(minY));
    }

    const translateCoordinate = () => {
      return 'translate(' + minX / 2 + 'px,' + minY / 2 + 'px)';
    };

    return (
      <Droppable>
        <CanvasContainer
          id="modeling-editor-canvas"
          width={diagram.bounds.width + minX}
          height={diagram.bounds.height + minY}
          isStatic={isStatic}
          ref={this.layer}
          data-cy="modeling-editor-canvas"
        >
          <g style={{ transformOrigin: 'top left', transform: `${translateCoordinate()}` }}>
            {this.layer.current && (
              <svg x="50%" y="50%">
                {/* be careful to change the drawing order -> if relationships are drawn first -> relationships will not be visible in containers */}
                {diagram.ownedElements.map((element) => (
                  <UMLElementComponent key={element} id={element} />
                ))}
                {diagram.ownedRelationships.map((relationship) => (
                  <UMLElementComponent key={relationship} id={relationship} />
                ))}
                <ConnectionPreview />
              </svg>
            )}
          </g>
        </CanvasContainer>
      </Droppable>
    );
  }
}

export const Canvas: ConnectedComponent<ComponentType<Props>, OwnProps & { ref: LegacyRef<CanvasComponent> }> = enhance(
  CanvasComponent,
);
