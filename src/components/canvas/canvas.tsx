import React, { Component, createRef, RefObject } from 'react';
import { connect } from 'react-redux';
import { ModelState } from '../store/model-state';
import { Grid } from './grid';
import { CanvasContext, CanvasProvider } from './canvas-context';
import { CoordinateSystem } from './coordinate-system';
import { ConnectLayer } from '../connectable/connect-layer';
import { LayoutedElement } from '../layouted-element/layouted-element';
import { LayoutedRelationship } from '../layouted-relationship/layouted-relationship';
import { Droppable } from '../draggable/droppable';
import { DropEvent } from '../draggable/drop-event';
import { Diagram } from '../../services/diagram/diagram';
import { DiagramRepository } from '../../services/diagram/diagram-repository';
import { ElementRepository } from '../../services/element/element-repository';
import { KeyboardEventListener } from './keyboard-eventlistener';
import { PopupLayer } from '../popup/popup-layer';
import { ApollonMode } from '../../typings';

class CanvasComponent extends Component<Props, State> {
  state: State = {
    isMounted: false,
  };
  canvas: RefObject<HTMLDivElement> = createRef();
  layer: RefObject<SVGSVGElement> = createRef();
  popup: RefObject<PopupLayer> = createRef();

  coordinateSystem = new CoordinateSystem(this.canvas, this.props.diagram.bounds.width, this.props.diagram.bounds.height);

  componentDidMount() {
    this.setState({ isMounted: true }, this.center);
  }

  center = () => {
    const container = this.canvas.current!.parentElement!;
    const { width, height } = container.getBoundingClientRect();
    container.scrollTo(this.coordinateSystem.width / 2 - width / 2, this.coordinateSystem.height / 2 - height / 2);
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

  private deselectAll = (event: React.MouseEvent) => {
    if (event.target !== this.layer.current || event.shiftKey) return;
    this.props.select(null);
  };

  render() {
    const { diagram, mode } = this.props;
    const context: CanvasContext = {
      canvas: this.canvas.current!,
      coordinateSystem: this.coordinateSystem,
    };

    return (
      <div ref={this.canvas} tabIndex={0} onMouseDown={this.deselectAll}>
        <CanvasProvider value={context}>
          <Droppable onDrop={this.onDrop}>
            <Grid grid={10} width={diagram.bounds.width} height={diagram.bounds.height} show={mode !== ApollonMode.Assessment}>
              <PopupLayer ref={this.popup}>
                {this.state.isMounted && (
                  <>
                    <KeyboardEventListener popup={this.popup} />
                    <svg className="svg" width="100%" height="100%" ref={this.layer}>
                      <ConnectLayer>
                        {diagram.ownedElements.map(element => (
                          <LayoutedElement key={element} element={element} />
                        ))}
                        {diagram.ownedRelationships.map(relationship => (
                          <LayoutedRelationship key={relationship} relationship={relationship} container={this.canvas} />
                        ))}
                      </ConnectLayer>
                    </svg>
                  </>
                )}
              </PopupLayer>
            </Grid>
          </Droppable>
        </CanvasProvider>
      </div>
    );
  }
}

interface OwnProps {}

interface StateProps {
  diagram: Diagram;
  mode: ApollonMode;
}

interface DispatchProps {
  create: typeof ElementRepository.create;
  select: typeof ElementRepository.select;
}

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
  }
);

export const Canvas = enhance(CanvasComponent);
