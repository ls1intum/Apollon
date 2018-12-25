import React, { Component, ComponentClass, RefObject } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withTheme } from 'styled-components';
import throttled from 'lodash/throttle';
import isEqual from 'lodash/isEqual';
import { Styles as Theme } from './../Theme';
import { ThemeProvider } from 'styled-components';
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
} from './../../services/redux';

import ResizeHandler, { Direction } from './ResizeHandler';
import Port from './Port';
import Droppable from './Droppable';

import * as Plugins from './../../domain/plugins';
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

  private onMouseOver = (event: React.MouseEvent) => {
    event.stopPropagation();
    this.setState({ hover: true });
  };

  private onMouseLeave = (event: React.MouseEvent) => {
    this.setState({ hover: false });
  };

  private onClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    this.toggleEntityInteractiveElement();
  };

  private onDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    this.props.openDetailsPopup(this.props.element.id);
  };

  private onMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    const bounds = event.currentTarget.firstElementChild!.getBoundingClientRect();
    const element: Element = {
      ...this.props.element,
      selected: event.shiftKey ? !this.state.selected : true,
    };

    let x = event.clientX - bounds.left;
    let y = event.clientY - bounds.top;

    let owner = this.props.element.owner;
    while (owner) {
      x += owner.bounds.x;
      y += owner.bounds.y;
      owner = owner.owner;
    }

    this.setState({
      selected: element.selected,
      moving: this.state.features.elementIsMovable,
      offset: { x, y },
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
      let x = event.layerX - this.state.offset.x;
      let y = event.layerY - this.state.offset.y;

      x = Math.round(x / 10) * 10;
      y = Math.round(y / 10) * 10;
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
      const { bounds, offset } = this.state;
      let width = event.layerX - bounds.x;
      let height = event.layerY - bounds.y;

      if (offset) {
        width -= offset.x;
        height -= offset.y;
      }

      width = Math.round(width / 10) * 10;
      height = Math.round(height / 10) * 10;

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
      offset: { x: 0, y: 0 },
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

    let x = 0;
    let y = 0;

    let owner = this.props.element.owner;
    while (owner) {
      x += owner.bounds.x;
      y += owner.bounds.y;
      owner = owner.owner;
    }

    this.setState({
      selected: true,
      resizing: true,
      direction: direction,
      offset: { x, y },
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
    const {
      element,
      editorMode,
      interactiveElementsMode,
      interactiveElementIds,
    } = this.props;

    const { width, height } = this.state.bounds;

    const { features } = this.state;

    const Component = (Plugins as any)[`${element.kind}Component`];

    return (
      <Droppable element={element} container={this.props.container}>
        <Container
          {...this.state.bounds}
          onMouseOver={
            (features.elementIsHoverable && this.onMouseOver) || undefined
          }
          onMouseOut={
            (features.elementIsHoverable && this.onMouseLeave) || undefined
          }
          onMouseDown={
            (features.elementIsSelectable && this.onMouseDown) || undefined
          }
          onClick={
            (features.elementIsInteractable && this.onClick) || undefined
          }
          onDoubleClick={
            (features.elementIsEditable && this.onDoubleClick) || undefined
          }
          movable={this.state.features.elementIsMovable}
          moving={this.state.moving}
        >
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
          <ThemeProvider
            theme={{
              background:
                editorMode === EditorMode.InteractiveElementsView
                  ? interactiveElementIds.has(element.id)
                    ? this.props.theme.interactiveAreaColor
                    : this.state.hover
                    ? this.props.theme.interactiveAreaHoverColor
                    : undefined
                  : undefined,
            }}
          >
            {(!(
              editorMode === EditorMode.InteractiveElementsView &&
              interactiveElementsMode === InteractiveElementsMode.Hidden &&
              interactiveElementIds.has(element.id)
            ) && (
              <Component element={element}>
                {element.ownedElements.map((child: Element) => {
                  return (
                    <ComposeLayoutedElement
                      key={child.id}
                      element={child}
                      container={this.props.container}
                      openDetailsPopup={this.props.openDetailsPopup}
                    />
                  );
                })}
              </Component>
            )) || <></>}
          </ThemeProvider>
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
              <Port
                element={element}
                show={this.state.hover}
                rectEdge="RIGHT"
              />
              <Port
                element={element}
                show={this.state.hover}
                rectEdge="BOTTOM"
              />
              <Port element={element} show={this.state.hover} rectEdge="LEFT" />
            </g>
          )}
        </Container>
      </Droppable>
    );
  }
}

interface OwnProps {
  element: Element;
  container: RefObject<HTMLDivElement>;
  openDetailsPopup: (id: string) => void;
}

interface StateProps {
  editorMode: EditorMode;
  apollonMode: ApollonMode;
  interactiveElementsMode: InteractiveElementsMode;
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
    interactiveElementIds: getAllInteractiveElementIds(state),
  };
}

const ComposeLayoutedElement = compose<ComponentClass<OwnProps>>(
  withTheme,
  connect(
    mapStateToProps,
    {
      update: ElementRepository.update,
      onToggleInteractiveElements: toggleInteractiveElements,
    }
  )
)(LayoutedElement);

export default ComposeLayoutedElement;
