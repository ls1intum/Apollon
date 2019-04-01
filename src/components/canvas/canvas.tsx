import React, { Component, createRef, RefObject } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Diagram } from '../../services/diagram/diagram';
import { DiagramRepository } from '../../services/diagram/diagram-repository';
import { ElementRepository } from '../../services/element/element-repository';
import { ApollonMode } from '../../typings';
import { ConnectLayer } from '../connectable/connect-layer';
import { DropEvent } from '../draggable/drop-event';
import { Droppable } from '../draggable/droppable';
import { LayoutedElement } from '../layouted-element/layouted-element';
import { LayoutedRelationship } from '../layouted-relationship/layouted-relationship';
import { PopupLayer } from '../popup/popup-layer';
import { ModelState } from '../store/model-state';
import { CanvasContext, CanvasProvider } from './canvas-context';
import { CoordinateSystem } from './coordinate-system';
import { Grid } from './grid';
import { KeyboardEventListener } from './keyboard-eventlistener';

const Container = styled.div`
  height: 100%;
`;

class CanvasComponent extends Component<Props, State> {
  state: State = {
    isMounted: false,
  };

  canvas: RefObject<HTMLDivElement> = createRef();
  layer: RefObject<SVGSVGElement> = createRef();
  popup: RefObject<PopupLayer> = createRef();
  coordinateSystem = new CoordinateSystem(this.layer);

  componentDidMount() {
    this.setState({ isMounted: true }, this.center);
  }

  center = () => {
    const container = this.canvas.current!.parentElement!;
    const { width, height } = container.getBoundingClientRect();
    container.scrollTo(this.props.diagram.bounds.width / 2 - width / 2, this.props.diagram.bounds.height / 2 - height / 2);
  };

  onDrop = (event: DropEvent) => {
    if (!event.action) return;
    const element = event.action.element;
    const offset = this.coordinateSystem.offset();
    const position = this.coordinateSystem.screenToPoint(event.position.x, event.position.y);
    element.bounds.x = position.x - offset.x;
    element.bounds.y = position.y - offset.y;

    this.props.create(element);
  };

  render() {
    const { diagram, mode } = this.props;
    const context: CanvasContext = {
      canvas: this.canvas.current!,
      coordinateSystem: this.coordinateSystem,
    };

    return (
      <Container ref={this.canvas} tabIndex={0} onMouseDown={this.deselectAll}>
        <CanvasProvider value={context}>
          <Droppable onDrop={this.onDrop}>
            <Grid grid={10} width={diagram.bounds.width} height={diagram.bounds.height} show={mode !== ApollonMode.Assessment}>
              <PopupLayer ref={this.popup}>
                <svg
                  className="svg"
                  width={diagram.bounds.width / 2}
                  height={diagram.bounds.height / 2}
                  ref={this.layer}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    overflow: 'visible',
                  }}
                >
                  {this.state.isMounted && (
                    <g>
                      <circle cx={0} cy={0} r={5} fill="green" />
                      <rect
                        x={-diagram.bounds.width / 2}
                        y={-diagram.bounds.height / 2}
                        width={diagram.bounds.width}
                        height={diagram.bounds.height}
                        fill="red"
                        fillOpacity={0.1}
                      />
                      <KeyboardEventListener popup={this.popup} />
                      <ConnectLayer>
                        {diagram.ownedElements.map(element => (
                          <LayoutedElement key={element} element={element} />
                        ))}
                        {diagram.ownedRelationships.map(relationship => (
                          <LayoutedRelationship key={relationship} relationship={relationship} container={this.canvas} />
                        ))}
                      </ConnectLayer>
                    </g>
                  )}
                </svg>
              </PopupLayer>
            </Grid>
          </Droppable>
        </CanvasProvider>
      </Container>
    );
  }

  private deselectAll = (event: React.MouseEvent) => {
    const deselect: boolean =
      !!this.canvas.current &&
      !!this.canvas.current.firstElementChild &&
      this.canvas.current.firstElementChild !== event.target &&
      event.target !== this.layer.current;
    if (deselect || event.shiftKey) return;
    this.props.select(null);
  };
}

type OwnProps = {};

type StateProps = {
  diagram: Diagram;
  mode: ApollonMode;
};

type DispatchProps = {
  create: typeof ElementRepository.create;
  select: typeof ElementRepository.select;
};

type Props = OwnProps & StateProps & DispatchProps;

interface State {
  isMounted: boolean;
}

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state: ModelState): StateProps => ({
    diagram: DiagramRepository.read(state),
    mode: state.editor.mode,
  }),
  {
    create: ElementRepository.create,
    select: ElementRepository.select,
  },
);

export const Canvas = enhance(CanvasComponent);
