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
  canvas: RefObject<HTMLDivElement> = createRef();
  layer: RefObject<SVGSVGElement> = createRef();
  popup: RefObject<PopupLayer> = createRef();

  state: State = {
    isMounted: false,
    coordinateSystem: new CoordinateSystem(this.layer, this.canvas, this.props.diagram.bounds.width, this.props.diagram.bounds.height),
  };

  componentDidMount() {
    this.setState({ isMounted: true }, this.center);
    window.addEventListener('resize', this.center);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.center);
  }

  center = () => {
    const container = this.canvas.current!.parentElement!;
    const { width, height } = container.getBoundingClientRect();
    container.scrollTo(this.props.diagram.bounds.width / 2 - width / 2, this.props.diagram.bounds.height / 2 - height / 2);
  };

  onDrop = (event: DropEvent) => {
    if (!event.action) return;
    const element = event.action.element;
    const offset = this.state.coordinateSystem.offset();
    const position = this.state.coordinateSystem.screenToPoint(event.position.x, event.position.y);
    element.bounds.x = position.x - offset.x;
    element.bounds.y = position.y - offset.y;

    this.props.create(element);
  };

  componentDidUpdate(prevProps: Props) {
    if (
      prevProps.diagram.bounds.width !== this.props.diagram.bounds.width ||
      prevProps.diagram.bounds.height !== this.props.diagram.bounds.height
    ) {
      this.setState({
        coordinateSystem: new CoordinateSystem(this.layer, this.canvas, this.props.diagram.bounds.width, this.props.diagram.bounds.height),
      }, this.center);
    }
  }

  render() {
    const { diagram, mode } = this.props;
    const context: CanvasContext = {
      canvas: this.canvas.current!,
      coordinateSystem: this.state.coordinateSystem,
    };

    return (
      <Container ref={this.canvas} tabIndex={0} onMouseDown={this.deselectAll}>
        <CanvasProvider value={context}>
          <Droppable onDrop={this.onDrop}>
            <Grid grid={10} width={diagram.bounds.width} height={diagram.bounds.height} show={mode !== ApollonMode.Assessment}>
              <PopupLayer ref={this.popup}>
                <svg
                  className="svg"
                  width={diagram.bounds.width}
                  height={diagram.bounds.height}
                  ref={this.layer}
                  style={{
                    position: 'absolute',
                    top: `calc(50% - ${diagram.bounds.height / 2}px)`,
                    left: `calc(50% - ${diagram.bounds.width / 2}px)`,
                    overflow: 'visible',
                  }}
                >
                  {this.state.isMounted && (
                    <g>
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
  coordinateSystem: CoordinateSystem;
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
