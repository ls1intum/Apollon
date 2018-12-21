import React, { Component, ComponentClass, RefObject } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withTheme } from 'styled-components';
import throttled from 'lodash/throttle';
import isEqual from 'lodash/isEqual';
import { Styles as Theme } from './../Theme';
import {
  ApollonMode,
  EditorMode,
  InteractiveElementsMode,
} from './../../services/EditorService';
import Element from './../../domain/Element';
import { UUID } from './../../domain/utils/uuid';
import { ElementRepository } from './../../domain/Element';

import { State as ReduxState } from './../Store';
import {
  getAllInteractiveElementIds,
  toggleInteractiveElements,
} from './../../gui/redux';

import ResizeHandler, { Direction } from './ResizeHandler';
import Port from './Port';

import { Container } from './styles';

class LayoutedElement extends Component<Props, State> {
  state: State = {
    hover: false,
    selected: false,
    moving: false,
    resizing: false,
    bounds: { ...this.props.element.bounds },
    features: this.getFeatures(this.props),
  };

  componentDidMount() {
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    this.props.container.current &&
      this.props.container.current.addEventListener('mouseup', this.unselect);
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.props.container.current &&
      this.props.container.current.removeEventListener(
        'mouseup',
        this.unselect
      );
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: State) {
    if (this.props.editorMode !== prevProps.editorMode) {
      this.setState({ features: this.getFeatures(this.props) });
    }
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    return !isEqual(nextProps, this.props) || !isEqual(nextState, this.state);
  }

  private getFeatures(props: Readonly<Props>) {
    return {
      elementIsHoverable: props.apollonMode !== ApollonMode.ReadOnly,
      elementIsSelectable: props.editorMode === EditorMode.ModelingView,
      elementIsResizable:
        props.apollonMode !== ApollonMode.ReadOnly &&
        props.editorMode === EditorMode.ModelingView,
      elementIsMovable:
        props.apollonMode !== ApollonMode.ReadOnly &&
        props.editorMode === EditorMode.ModelingView,
      elementIsInteractable:
        props.apollonMode !== ApollonMode.ReadOnly &&
        props.editorMode === EditorMode.InteractiveElementsView,
      elementIsEditable:
        props.apollonMode !== ApollonMode.ReadOnly &&
        props.editorMode === EditorMode.ModelingView,
      elementHasPorts:
        props.apollonMode !== ApollonMode.ReadOnly &&
        props.editorMode === EditorMode.ModelingView,
    };
  }

  private onMouseOver = () => this.setState({ hover: true });

  private onMouseLeave = () => this.setState({ hover: false });

  private onClick = () => this.toggleEntityInteractiveElement();

  private onDoubleClick = () => this.props.openDetailsPopup();

  private onMouseDown = (event: React.MouseEvent) => {
    const bounds = event.currentTarget.firstElementChild!.getBoundingClientRect();
    const element: Element = {
      ...this.props.element,
      selected: event.shiftKey ? !this.state.selected : true,
    };

    this.setState({
      selected: element.selected,
      moving: this.state.features.elementIsMovable,
      offset: { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
    });
    this.props.update(element);
  };

  private onMouseMove = (event: MouseEvent) => {
    if (
      this.props.editorMode !== EditorMode.ModelingView ||
      this.props.apollonMode === ApollonMode.ReadOnly
    )
      return;
    if (this.state.moving && this.state.offset) {
      const { bounds } = this.state;
      const x = Math.round((event.layerX - this.state.offset.x) / 10) * 10;
      const y = Math.round((event.layerY - this.state.offset.y) / 10) * 10;
      if (bounds.x === x && bounds.y == y) return;

      const element: Element = {
        ...this.props.element,
        bounds: { ...bounds, x, y },
      };
      this.setState({
        bounds: element.bounds,
      });
      this.throttled_update(element);
    }
    if (this.state.resizing) {
      const { bounds } = this.state;
      const width = Math.round((event.layerX - bounds.x) / 10) * 10;
      const height = Math.round((event.layerY - bounds.y) / 10) * 10;

      const element: Element = {
        ...this.props.element,
        bounds: { ...bounds, width, height },
      };
      this.setState({
        bounds: element.bounds,
      });
      this.throttled_update(element);
    }
  };

  private onMouseUp = (event: MouseEvent) => {
    if (!this.state.moving && !this.state.resizing) return;
    this.setState({
      moving: false,
      resizing: false,
    });
  };

  private unselect = (event: MouseEvent) => {
    if (!this.state.selected || this.state.hover || event.shiftKey) return;
    const element: Element = {
      ...this.props.element,
      selected: false,
    };
    this.setState({
      selected: element.selected,
    });
    this.props.update(element);
  };

  private startResize = (direction: Direction) => (event: React.MouseEvent) => {
    event.stopPropagation();

    this.setState({
      selected: true,
      resizing: true,
      direction: direction,
    });
  };

  private throttled_update = throttled(this.props.update, 100);

  toggleEntityInteractiveElement = () => {
    const { element: entity, interactiveElementIds } = this.props;

    const interactiveMemberIdsOfEntity = [
      // ...entity.attributes.map(attr => attr.id),
      // ...entity.methods.map(method => method.id),
    ].filter(id => interactiveElementIds.has(id));

    this.props.onToggleInteractiveElements(
      entity.id,
      ...interactiveMemberIdsOfEntity
    );
  };

  render() {
    const { element, editorMode, interactiveElementIds } = this.props;

    const { width, height } = this.state.bounds;

    const { features } = this.state;

    return (
      <Container
        {...this.state.bounds}
        onMouseOver={
          (features.elementIsHoverable && this.onMouseOver) || undefined
        }
        onMouseLeave={
          (features.elementIsHoverable && this.onMouseLeave) || undefined
        }
        onMouseDown={
          (features.elementIsSelectable && this.onMouseDown) || undefined
        }
        onClick={(features.elementIsInteractable && this.onClick) || undefined}
        onDoubleClick={
          (features.elementIsEditable && this.onDoubleClick) || undefined
        }
        movable={this.state.features.elementIsMovable}
        moving={this.state.moving}
      >
        {element.render &&
          React.cloneElement(
            element.render({
              hover: this.state.hover,
              editorMode,
              interactiveElementsMode: this.props.interactiveElementsMode,
              interactiveElementIds,
              theme: this.props.theme,
              toggleInteractiveElements: this.props.onToggleInteractiveElements,
            }),
            {}
          )}
        {features.elementIsSelectable && this.state.selected && (
          <g>
            <rect
              x={-3}
              y={-3}
              width={width + 6}
              height={height + 6}
              fill="none"
              stroke={this.props.theme.highlightColor}
              strokeWidth={5}
            />
          </g>
        )}
        {features.elementIsResizable && this.state.selected && (
          <g transform="translate(-9, -9)">
            <ResizeHandler
              direction={Direction.SE}
              onMouseDown={this.startResize(Direction.SE)}
            />
          </g>
        )}
        {features.elementHasPorts && (
          <g>
            <Port element={element} show={this.state.hover} rectEdge="TOP" />
            <Port element={element} show={this.state.hover} rectEdge="RIGHT" />
            <Port element={element} show={this.state.hover} rectEdge="BOTTOM" />
            <Port element={element} show={this.state.hover} rectEdge="LEFT" />
          </g>
        )}
      </Container>
    );
  }
}

interface OwnProps {
  element: Element;
  container: RefObject<HTMLDivElement>;
  openDetailsPopup: () => void;
}

interface StateProps {
  editorMode: EditorMode;
  apollonMode: ApollonMode;
  interactiveElementsMode: InteractiveElementsMode;
  gridSize: number;
  interactiveElementIds: ReadonlySet<UUID>;
}

interface DispatchProps {
  update: typeof ElementRepository.update;
  onToggleInteractiveElements: (...ids: UUID[]) => void;
}

interface ThemeProps {
  theme: Theme;
}

type Props = OwnProps & StateProps & ThemeProps & DispatchProps;

interface State {
  hover: boolean;
  selected: boolean;
  moving: boolean;
  direction?: Direction;
  resizing: boolean;
  bounds: { x: number; y: number; width: number; height: number };
  offset?: { x: number; y: number };
  features: { [feature: string]: boolean };
}

function mapStateToProps(state: ReduxState): StateProps {
  return {
    editorMode: state.editor.editorMode,
    apollonMode: state.editor.mode,
    interactiveElementsMode: state.editor.interactiveMode,
    gridSize: state.editor.gridSize,
    interactiveElementIds: getAllInteractiveElementIds(state),
  };
}

export default compose<ComponentClass<OwnProps>>(
  withTheme,
  connect(
    mapStateToProps,
    {
      update: ElementRepository.update,
      onToggleInteractiveElements: toggleInteractiveElements,
    }
  )
)(LayoutedElement);
