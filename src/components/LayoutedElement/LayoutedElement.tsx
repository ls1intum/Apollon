import React, { Component, ComponentClass, RefObject } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withTheme } from 'styled-components';
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
import { element } from 'prop-types';

class CanvasEntity extends Component<Props, State> {
  state: State = {
    hover: false,
    selected: false,
    moving: false,
    resizing: false,
    bounds: { ...this.props.entity.bounds },
  };

  componentDidUpdate() {
    if (
      this.props.entity.bounds.width !== this.state.bounds.width ||
      this.props.entity.bounds.height !== this.state.bounds.height
    ) {
      this.setState({ bounds: { ...this.props.entity.bounds } });
    }
  }

  componentDidMount() {
    if (
      this.props.editorMode === EditorMode.ModelingView &&
      this.props.apollonMode !== ApollonMode.ReadOnly
    ) {
      document.addEventListener('mousemove', this.onMouseMove);
    }
    document.addEventListener('mouseup', this.onMouseUp);
    this.props.container.current &&
      this.props.container.current.addEventListener('mouseup', this.unselect);
  }

  componentWillUnmount() {
    if (
      this.props.editorMode === EditorMode.ModelingView &&
      this.props.apollonMode !== ApollonMode.ReadOnly
    ) {
      document.removeEventListener('mousemove', this.onMouseMove);
    }
    document.removeEventListener('mouseup', this.onMouseUp);
    this.props.container.current &&
      this.props.container.current.removeEventListener(
        'mouseup',
        this.unselect
      );
  }

  private onMouseOver = (event: React.MouseEvent) => {
    this.setState({ hover: true });
  };

  private onMouseLeave = (event: React.MouseEvent) => {
    this.setState({ hover: false });
  };

  private onMouseDown = (event: React.MouseEvent) => {
    let bounds = event.currentTarget.getBoundingClientRect();

    const element: Element = {
      ...this.props.entity,
      render: (options: any) => <></>,
      selected: event.shiftKey ? !this.state.selected : true,
    };

    this.setState({
      selected: element.selected,
      moving: true,
      offset: { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
    });
    this.props.update(element);
  };

  private onMouseMove = (event: MouseEvent) => {
    if (this.state.moving) {
      const x = event.layerX - this.state.offset!.x;
      const y = event.layerY - this.state.offset!.y;

      const element: Element = {
        ...this.props.entity,
        render: (options: any) => <></>,
        bounds: {
          ...this.props.entity.bounds,
          x: Math.ceil(x / 10) * 10,
          y: Math.ceil(y / 10) * 10,
        },
      };
      this.setState({
        bounds: element.bounds,
      });
      this.props.update(element);
    }
    if (this.state.resizing) {
      const x = event.layerX;
      const y = event.layerY;

      const element: Element = {
        ...this.props.entity,
        render: (options: any) => <></>,
        bounds: {
          ...this.props.entity.bounds,
          width: Math.max(x - this.props.entity.bounds.x, 100),
        },
      };
      this.setState({
        bounds: element.bounds,
      });
      this.props.update(element);
    }
  };

  private onMouseUp = (event: MouseEvent) => {
    this.setState({
      moving: false,
      resizing: false,
    });
  };

  private unselect = (event: MouseEvent) => {
    const element: Element = {
      ...this.props.entity,
      render: (options: any) => <></>,
      selected: event.shiftKey ? this.state.selected : this.state.hover,
    };
    this.setState({
      selected: element.selected,
    });
    this.props.update(element);
  };

  toggleEntityInteractiveElement = () => {
    const { entity, interactiveElementIds } = this.props;

    const interactiveMemberIdsOfEntity = [
      // ...entity.attributes.map(attr => attr.id),
      // ...entity.methods.map(method => method.id),
    ].filter(id => interactiveElementIds.has(id));

    this.props.onToggleInteractiveElements(
      entity.id,
      ...interactiveMemberIdsOfEntity
    );
  };

  private startResize = (direction: Direction) => (event: React.MouseEvent) => {
    event.stopPropagation();

    this.setState({
      selected: true,
      resizing: true,
      direction: direction,
    });
  };

  render() {
    const {
      entity,
      apollonMode,
      editorMode,
      interactiveElementIds,
    } = this.props;

    const containerStyle = this.computeContainerStyle();

    const onMouseDown =
      editorMode === EditorMode.ModelingView ? this.onMouseDown : undefined;

    const onClick =
      editorMode === EditorMode.InteractiveElementsView
        ? this.toggleEntityInteractiveElement
        : undefined;

    const { x, y, width, height } = this.state.bounds;

    return (
      <svg
        x={x}
        y={y}
        width={width}
        height={height}
        onMouseDown={onMouseDown}
        onMouseOver={this.onMouseOver}
        onMouseLeave={this.onMouseLeave}
        style={{ ...containerStyle, overflow: 'visible' }}
        id={`entity-${entity.id}`}
        onClick={onClick}
        onDoubleClick={
          apollonMode === ApollonMode.ReadOnly
            ? undefined
            : this.props.openDetailsPopup
        }
        pointerEvents="all"
      >
        {entity.render &&
          React.cloneElement(
            entity.render({
              hover: this.state.hover,
              editorMode,
              interactiveElementsMode: this.props.interactiveElementsMode,
              interactiveElementIds,
              theme: this.props.theme,
              toggleInteractiveElements: this.props.onToggleInteractiveElements,
            }),
            {}
          )}
        {this.props.editorMode === EditorMode.ModelingView &&
          this.state.selected && (
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
              {this.props.apollonMode !== ApollonMode.ReadOnly && (
                <g transform="translate(-9, -9)">
                  <ResizeHandler
                    direction={Direction.SE}
                    onMouseDown={this.startResize(Direction.SE)}
                  />
                </g>
              )}
            </g>
          )}
        {this.props.editorMode === EditorMode.ModelingView && this.props.apollonMode !== ApollonMode.ReadOnly && (
          <g>
            <Port element={entity} show={this.state.hover} rectEdge="TOP" />
            <Port element={entity} show={this.state.hover} rectEdge="RIGHT" />
            <Port element={entity} show={this.state.hover} rectEdge="BOTTOM" />
            <Port element={entity} show={this.state.hover} rectEdge="LEFT" />
          </g>
        )}
      </svg>
    );
  }

  computeContainerStyle(): React.CSSProperties {
    const { apollonMode, editorMode } = this.props;
    const moving = this.state.moving;

    return {
      opacity: apollonMode !== ApollonMode.ReadOnly && moving ? 0.35 : 1,
      cursor:
        apollonMode !== ApollonMode.ReadOnly &&
        editorMode === EditorMode.ModelingView
          ? 'move'
          : 'default',
    };
  }
}

interface OwnProps {
  entity: Element;
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
)(CanvasEntity);
