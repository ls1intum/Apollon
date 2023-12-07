import React, { Component, ComponentType } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ApollonMode } from '../../services/editor/editor-types';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../utils/actions/actions';
import { ModelState } from '../store/model-state';
import { CanvasContext } from './canvas-context';
import { withCanvas } from './with-canvas';
import { UMLElementState } from '../../services/uml-element/uml-element-types';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { EditorRepository } from '../../services/editor/editor-repository';

type OwnProps = {};

type StateProps = {
  readonly: boolean;
  mode: ApollonMode;
  elements: UMLElementState;
  resizingInProgress: boolean;
  connectingInProgress: boolean;
  reconnectingInProgress: boolean;
  hoveringInProgress: boolean;
  zoomFactor: number;
};

type DispatchProps = {
  select: AsyncDispatch<typeof UMLElementRepository.select>;
  changeSelectionBox: typeof EditorRepository.setSelectionBoxActive;
};

type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

type LocalState = {
  selectionStarted: boolean;
  selectionRectangle: SelectionRectangle;
};

type SelectionRectangle = {
  startX: number | undefined;
  startY: number | undefined;
  endX: number | undefined;
  endY: number | undefined;
};

const enhance = compose<ComponentType<OwnProps>>(
  withCanvas,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state) => ({
      readonly: state.editor.readonly,
      mode: state.editor.mode,
      elements: state.elements,
      resizingInProgress: state.resizing.length > 0,
      connectingInProgress: state.connecting.length > 0,
      reconnectingInProgress: Object.keys(state.reconnecting).length > 0,
      hoveringInProgress: state.hovered.length > 0,
      zoomFactor: state.editor.zoomFactor,
    }),
    {
      select: UMLElementRepository.select,
      changeSelectionBox: EditorRepository.setSelectionBoxActive,
    },
  ),
);

class MouseEventListenerComponent extends Component<Props, LocalState> {
  constructor(props: Props) {
    super(props);
    this.state = {
      selectionStarted: false,
      selectionRectangle: {
        startX: undefined,
        startY: undefined,
        endX: undefined,
        endY: undefined,
      },
    };
  }

  componentDidMount() {
    const { layer } = this.props.canvas;
    if (!this.props.readonly && this.props.mode !== ApollonMode.Assessment) {
      layer.addEventListener('mousedown', this.mouseDown);
      layer.addEventListener('mousemove', this.mouseMove);
      layer.addEventListener('mouseup', this.mouseUp);
    }
  }

  render() {
    return (
      this.state.selectionStarted &&
      this.state.selectionRectangle.endX && (
        <svg
          opacity={0.5}
          pointerEvents={'none'}
          style={{
            position: 'fixed',
            left: `${Math.min(this.state.selectionRectangle.startX!, this.state.selectionRectangle.endX!)}px`,
            width: `${Math.abs(this.state.selectionRectangle.startX! - this.state.selectionRectangle.endX!)}px`,
            top: `${Math.min(this.state.selectionRectangle.startY!, this.state.selectionRectangle.endY!)}px`,
            height: `${Math.abs(this.state.selectionRectangle.startY! - this.state.selectionRectangle.endY!)}px`,
            backgroundColor: '#1E90FF',
            borderStyle: 'solid',
            borderWidth: '1px',
            borderColor: 'blue',
          }}
        />
      )
    );
  }

  /**
   * Mouse down handler for starting the box selection
   * @param event The triggering mouse down event
   */
  private mouseDown = (event: MouseEvent): void => {
    // if the cursor went out of the bounds of the canvas, then the selection box is still active
    // we want to continue with the selection box from where we left off
    if (this.state.selectionStarted) {
      this.setState((prevState) => {
        return {
          ...prevState,
          selectionRectangle: {
            ...prevState.selectionRectangle,
            endX: event.clientX,
            endY: event.clientY,
          },
        };
      });

      return;
    }

    // the selection box will activate when clicking anywhere outside the bounds of an element
    // however:
    //      * resizing an element can start when clicking slightly outside its bounds
    //      * the connection/reconnection port of an element is outside its bounding box
    // in these cases the selection box needs to be disabled
    if (
      this.props.resizingInProgress ||
      this.props.connectingInProgress ||
      this.props.reconnectingInProgress ||
      this.props.hoveringInProgress
    ) {
      return;
    }

    this.props.changeSelectionBox(true);

    this.setState({
      selectionStarted: true,
      selectionRectangle: {
        startX: event.clientX,
        startY: event.clientY,
        endX: undefined,
        endY: undefined,
      },
    });
  };

  /**
   * Mouse up handler for finalising the box selection and determining which elements to select
   */
  private mouseUp = (): void => {
    // if no selection has been started, we can skip determining which
    // elements are contained in the selection box.
    if (!this.state.selectionStarted) {
      return;
    }

    const selection = this.getElementIDsInSelectionBox();
    this.props.select(selection);

    this.setState({
      selectionStarted: false,
      selectionRectangle: {
        startX: undefined,
        startY: undefined,
        endX: undefined,
        endY: undefined,
      },
    });

    this.props.changeSelectionBox(false);
  };

  /**
   * Mouse move handler for dragging the selection rectangle
   * @param event The triggering mouse move event
   */
  private mouseMove = (event: MouseEvent): void => {
    if (!this.state.selectionStarted) {
      return;
    }

    const elementsInSelectionBox = this.getElementIDsInSelectionBox();

    this.setState((prevState) => {
      return {
        selectionStarted: prevState.selectionStarted,
        elementsInSelectionBox,
        selectionRectangle: {
          ...prevState.selectionRectangle,
          endX: event.clientX,
          endY: event.clientY,
        },
      };
    });
  };

  /**
   * Check whether a given IUMLElement is contained in the currently active selection rectangle.
   * Elements are only considered selected if they are fully contained within the selection rectangle.
   *
   * @param element The element for which containment in the selection box is determined
   */
  private isElementInSelectionBox = (element: IUMLElement): boolean => {
    const canvasOrigin = this.props.canvas.origin();

    if (
      !this.state.selectionRectangle.startX ||
      !this.state.selectionRectangle.endX ||
      !this.state.selectionRectangle.startY ||
      !this.state.selectionRectangle.endY
    ) {
      return false;
    }

    const selectionRectangleTopLeft =
      Math.min(this.state.selectionRectangle.startX, this.state.selectionRectangle.endX) / this.props.zoomFactor -
      canvasOrigin.x / this.props.zoomFactor;
    const selectionRectangleTopRight =
      Math.max(this.state.selectionRectangle.startX, this.state.selectionRectangle.endX) / this.props.zoomFactor -
      canvasOrigin.x / this.props.zoomFactor;
    const selectionRectangleBottomLeft =
      Math.min(this.state.selectionRectangle.startY, this.state.selectionRectangle.endY) / this.props.zoomFactor -
      canvasOrigin.y / this.props.zoomFactor;
    const selectionRectangleBottomRight =
      Math.max(this.state.selectionRectangle.startY, this.state.selectionRectangle.endY) / this.props.zoomFactor -
      canvasOrigin.y / this.props.zoomFactor;

    // determine if the given element is fully contained within the selection rectangle
    return (
      selectionRectangleTopLeft <= element.bounds.x &&
      element.bounds.x + element.bounds.width <= selectionRectangleTopRight &&
      selectionRectangleBottomLeft <= element.bounds.y &&
      element.bounds.y + element.bounds.height <= selectionRectangleBottomRight
    );
  };

  /**
   * Retrieve the IDs of all elements fully contained within the selection box
   */
  private getElementIDsInSelectionBox = (): string[] => {
    return Object.entries(this.props.elements).reduce((selectedIDs, [id, element]) => {
      if (element.owner !== null) {
        return selectedIDs;
      }

      if (this.isElementInSelectionBox(element)) {
        return [...selectedIDs, id];
      }

      return selectedIDs;
    }, [] as string[]);
  };
}

export const MouseEventListener = enhance(MouseEventListenerComponent);
