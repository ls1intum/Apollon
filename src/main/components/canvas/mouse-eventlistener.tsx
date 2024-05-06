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
import { areBoundsIntersecting, IBoundary } from '../../utils/geometry/boundary';
import { IPoint } from '../../utils/geometry/point';
import { defaults as getTheme } from '../../components/theme/styles';

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
  selectionRectangle: Partial<IBoundary>;
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
        x: undefined,
        y: undefined,
        width: undefined,
        height: undefined,
      },
    };
  }

  componentDidMount() {
    const { layer } = this.props.canvas;
    if (
      !this.props.readonly &&
      (this.props.mode === ApollonMode.Modelling || this.props.mode === ApollonMode.Exporting)
    ) {
      layer.addEventListener('mousedown', this.mouseDown);
      layer.addEventListener('mousemove', this.mouseMove);
      layer.addEventListener('mouseup', this.mouseUp);
    }
  }

  componentWillUnmount() {
    const { layer } = this.props.canvas;
    layer.removeEventListener('mousedown', this.mouseDown);
    layer.removeEventListener('mousemove', this.mouseMove);
    layer.removeEventListener('mouseup', this.mouseUp);
  }

  render() {
    const { x = 0, y = 0, width = 0, height = 0 } = this.state.selectionRectangle;

    const theme = getTheme();

    return (
      this.state.selectionStarted &&
      width != 0 && (
        <svg
          opacity={0.5}
          pointerEvents={'none'}
          style={{
            position: 'fixed',
            left: `${Math.min(x, x + width)}px`,
            width: `${Math.abs(width)}px`,
            top: `${Math.min(y, y + height)}px`,
            height: `${Math.abs(height)}px`,
            backgroundColor: theme.color.primary,
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

    // The selection box will activate when clicking anywhere outside the bounds of an element however:
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
        x: event.clientX,
        y: event.clientY,
        width: undefined,
        height: undefined,
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

    this.setState({
      selectionStarted: false,
      selectionRectangle: {
        x: undefined,
        y: undefined,
        width: undefined,
        height: undefined,
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

    const selection = this.getElementIDsInSelectionBox();

    this.props.select(selection, true);

    this.setState((prevState) => {
      return {
        selectionStarted: prevState.selectionStarted,
        selectionRectangle: {
          ...prevState.selectionRectangle,
          width: event.clientX - (prevState.selectionRectangle.x ?? 0),
          height: event.clientY - (prevState.selectionRectangle.y ?? 0),
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

    const { x, y, width, height } = this.state.selectionRectangle;

    if (!x || !y || !width || !height) {
      return false;
    }

    const normalizedSelectionBounds: IBoundary = {
      x: (x - canvasOrigin.x) / this.props.zoomFactor,
      y: (y - canvasOrigin.y) / this.props.zoomFactor,
      height: height / this.props.zoomFactor,
      width: width / this.props.zoomFactor,
    };

    return areBoundsIntersecting(element.bounds, normalizedSelectionBounds);
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
