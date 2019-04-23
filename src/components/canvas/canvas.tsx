import React, { Component, createRef, RefObject } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { IUMLDiagram } from '../../services/uml-diagram/uml-diagram';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { ApollonMode } from '../../typings';
// import { ConnectLayer } from '../connectable/connect-layer';
import { DropEvent } from '../draggable/drop-event';
import { Droppable } from '../draggable/droppable';
import { LayoutedElement } from '../layouted-element/layouted-element';
import { LayoutedRelationship } from '../layouted-relationship/layouted-relationship';
import { ModelState } from '../store/model-state';
import { CanvasContext, CanvasProvider } from './canvas-context';
import { CoordinateSystem } from './coordinate-system';
import { Grid } from './grid';
import { KeyboardEventListener } from './keyboard-eventlistener';
import { UMLElementComponent } from './../uml-element/uml-element-component';

const Container = styled.div`
  height: 100%;
  padding: 1em;
`;

const Svg = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  width: 50%;
  height: 50%;
  overflow: visible;
  transform: translate(100%, 100%);
`;

class CanvasComponent extends Component<Props, State> {
  state: State = {
    isMounted: false,
  };

  canvas: RefObject<HTMLDivElement> = createRef();
  layer: RefObject<SVGSVGElement> = createRef();
  coordinateSystem = new CoordinateSystem(this.layer);

  componentDidMount() {
    this.setState({ isMounted: true }, this.center);
  }

  center = () => {
    const container = this.canvas.current!.parentElement!;
    if ('scrollTo' in container) {
      const { width, height } = container.getBoundingClientRect();
      container.scrollTo(
        this.props.diagram.bounds.width / 2 - width / 2,
        this.props.diagram.bounds.height / 2 - height / 2,
      );
    }
  };

  onDrop = (event: DropEvent) => {
    if (!event.action) return;
    const elements = event.action.elements;
    const offset = this.coordinateSystem.offset();
    // const position = this.coordinateSystem.screenToPoint(event.position.x, event.position.y);
    for (const element of elements) {
      if (!element.owner) {
        element.bounds.x = Math.round((event.position.x - offset.x) / 10) * 10;
        element.bounds.y = Math.round((event.position.y - offset.y) / 10) * 10;
      }
    }

    this.props.create(elements);
  };

  render() {
    const { diagram, mode } = this.props;
    const context: CanvasContext = {
      canvas: this.canvas.current!,
      coordinateSystem: this.coordinateSystem,
    };

    return (
      <Container ref={this.canvas} tabIndex={0} onPointerDown={this.deselectAll}>
        <CanvasProvider value={context}>
          <Droppable onDrop={this.onDrop}>
            <Grid
              grid={10}
              width={diagram.bounds.width}
              height={diagram.bounds.height}
              show={mode !== ApollonMode.Assessment}
            >
              {/* <PopupLayer ref={this.popup}> */}
              <Svg width={diagram.bounds.width / 2} height={diagram.bounds.height / 2} ref={this.layer}>
                {this.state.isMounted && (
                  <g>
                    <KeyboardEventListener />
                    {/* <ConnectLayer> */}
                      {diagram.ownedElements.map(element => (
                        <UMLElementComponent key={element} id={element} component="canvas" />
                      ))}
                      {diagram.ownedRelationships.map(relationship => (
                        <LayoutedRelationship key={relationship} relationship={relationship} container={this.canvas} />
                      ))}
                    {/* </ConnectLayer> */}
                  </g>
                )}
              </Svg>
              {/* </PopupLayer> */}
            </Grid>
          </Droppable>
        </CanvasProvider>
      </Container>
    );
  }

  private deselectAll = (event: React.PointerEvent) => {
    const deselect: boolean =
      !!this.canvas.current &&
      !!this.canvas.current.firstElementChild &&
      this.canvas.current.firstElementChild !== event.target &&
      event.target !== this.layer.current;
    if (deselect || event.shiftKey) return;
    this.props.deselect();
  };
}

type OwnProps = {};

type StateProps = {
  diagram: IUMLDiagram;
  mode: ApollonMode;
};

type DispatchProps = {
  create: (values: IUMLElement | IUMLElement[]) => void;
  deselect: () => void;
};

type Props = OwnProps & StateProps & DispatchProps;

interface State {
  isMounted: boolean;
}

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state: ModelState): StateProps => ({
    diagram: state.diagram,
    mode: state.editor.mode,
  }),
  {
    create: UMLElementRepository.create,
    deselect: UMLElementRepository.deselect,
  },
);

export const Canvas = enhance(CanvasComponent);
