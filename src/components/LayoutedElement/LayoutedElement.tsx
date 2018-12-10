import React, { Component, ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withTheme } from 'styled-components';
import Member from './Member';
import Name from './Name';
import { Styles as Theme } from './../Theme';
import {
  ApollonMode,
  EditorMode,
  InteractiveElementsMode,
} from '../../domain/Options/types';
import { Entity } from './../../core/domain';
import { UUID } from './../../domain/utils/uuid';
import {
  computeEntityHeaderHeight,
  ENTITY_MEMBER_HEIGHT,
} from './../../rendering/layouters/entity';
import { ElementRepository } from './../../domain/Element';

import { State as ReduxState } from './../Store';
import {
  moveEntity,
  getAllInteractiveElementIds,
  toggleInteractiveElements,
  updateEntityWidth,
} from './../../gui/redux';

import ResizeHandler, { Direction } from './ResizeHandler';

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
  }

  componentWillUnmount() {
    if (
      this.props.editorMode === EditorMode.ModelingView &&
      this.props.apollonMode !== ApollonMode.ReadOnly
    ) {
      document.removeEventListener('mousemove', this.onMouseMove);
    }
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  private onMouseOver = (event: React.MouseEvent) => {
    this.setState({ hover: true });
  };

  private onMouseLeave = (event: React.MouseEvent) => {
    this.setState({ hover: false });
  };

  private onMouseDown = (event: React.MouseEvent) => {
    let bounds = event.currentTarget.getBoundingClientRect();

    const element: Entity = {
      ...this.props.entity,
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

      const element: Entity = {
        ...this.props.entity,
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
      this.props.moveEntity(element.id, {
        x: element.bounds.x,
        y: element.bounds.y,
      });
    }
    if (this.state.resizing) {
      const x = event.layerX;
      const y = event.layerY;

      const element: Entity = {
        ...this.props.entity,
        bounds: {
          ...this.props.entity.bounds,
          width: Math.max(x - this.props.entity.bounds.x, 100),
        },
      };
      this.setState({
        bounds: element.bounds,
      });
      this.props.update(element);
      this.props.updateEntityWidth(element.id, element.bounds.width);
    }
  };

  private onMouseUp = (event: MouseEvent) => {
    const element: Entity = {
      ...this.props.entity,
      selected: event.shiftKey ? this.state.selected : this.state.hover,
    };

    this.setState({
      moving: false,
      selected: element.selected,
      resizing: false,
    });
    this.props.update(element);
  };

  toggleEntityInteractiveElement = () => {
    const { entity, interactiveElementIds } = this.props;

    const interactiveMemberIdsOfEntity = [
      ...entity.attributes.map(attr => attr.id),
      ...entity.methods.map(method => method.id),
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

    const { attributes, methods, renderMode } = entity;

    const containerStyle = this.computeContainerStyle();

    const onMouseDown =
      editorMode === EditorMode.ModelingView ? this.onMouseDown : undefined;

    const onClick =
      editorMode === EditorMode.InteractiveElementsView
        ? this.toggleEntityInteractiveElement
        : undefined;

    let childY = computeEntityHeaderHeight(entity.kind) + 8;

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
      >
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={
            this.props.editorMode === EditorMode.InteractiveElementsView &&
            (this.state.hover ||
              interactiveElementIds.has(this.props.entity.id))
              ? this.props.theme.interactiveAreaColor
              : 'white'
          }
          stroke="black"
        />
        <Name entity={entity} />

        {renderMode.showAttributes && (
          <>
            {attributes.map(attribute => {
              const y = childY;
              childY += ENTITY_MEMBER_HEIGHT;
              return (
                <Member
                  y={y}
                  key={attribute.id}
                  entity={entity}
                  member={attribute}
                  editorMode={editorMode}
                  interactiveElementsMode={this.props.interactiveElementsMode}
                  canBeMadeInteractive={
                    !this.props.interactiveElementIds.has(entity.id)
                  }
                  isInteractiveElement={interactiveElementIds.has(attribute.id)}
                  onToggleInteractiveElements={() => {
                    this.props.onToggleInteractiveElements(attribute.id);
                  }}
                />
              );
            })}
          </>
        )}

        {renderMode.showMethods && (
          <>
            {methods.map(method => {
              const y = childY;
              childY += ENTITY_MEMBER_HEIGHT;
              return (
                <Member
                  y={y}
                  key={method.id}
                  entity={entity}
                  member={method}
                  editorMode={editorMode}
                  interactiveElementsMode={this.props.interactiveElementsMode}
                  canBeMadeInteractive={
                    !this.props.interactiveElementIds.has(entity.id)
                  }
                  isInteractiveElement={interactiveElementIds.has(method.id)}
                  onToggleInteractiveElements={() => {
                    this.props.onToggleInteractiveElements(method.id);
                  }}
                />
              );
            })}
          </>
        )}
        {this.props.apollonMode !== ApollonMode.ReadOnly &&
          this.props.editorMode === EditorMode.ModelingView &&
          this.state.selected && (
            <g transform="translate(-9, -9)">
              <ResizeHandler
                direction={Direction.SE}
                onMouseDown={this.startResize(Direction.SE)}
              />
            </g>
          )}
      </svg>
    );
  }

  computeContainerStyle(): React.CSSProperties {
    const { apollonMode, editorMode } = this.props;
    const moving = this.state.moving;

    return {
      opacity: moving ? 0.35 : 1,
      cursor:
        apollonMode !== ApollonMode.ReadOnly &&
        editorMode === EditorMode.ModelingView
          ? 'move'
          : 'default',
    };
  }
}

interface OwnProps {
  entity: Entity;
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
  moveEntity: typeof moveEntity;
  onToggleInteractiveElements: (...ids: UUID[]) => void;
  updateEntityWidth: typeof updateEntityWidth;
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
    editorMode: state.options.editorMode,
    apollonMode: state.options.mode,
    interactiveElementsMode: state.options.interactiveMode,
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
      moveEntity,
      onToggleInteractiveElements: toggleInteractiveElements,
      updateEntityWidth,
    }
  )
)(CanvasEntity);
