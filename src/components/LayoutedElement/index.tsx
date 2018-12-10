import React, { Component, ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import styled, { withTheme } from 'styled-components';
import Member from './Member';
import Name from './Name';
import ResizeHandle from './ResizeHandle';
import { Styles as Theme } from './../Theme';
import {
  ApollonMode,
  EditorMode,
  ElementSelection,
  InteractiveElementsMode,
} from '../../domain/Options/types';
import { Entity, EntityKind } from './../../core/domain';
import { UUID } from './../../domain/utils/uuid';
import {
  computeEntityHeight,
  ENTITY_MEMBER_LIST_VERTICAL_PADDING,
} from './../../rendering/layouters/entity';
import { ElementRepository } from './../../domain/Element';

import { moveEntity } from './../../gui/redux';

const MemberList = styled.div`
  border-top: 1px solid black;
  padding: ${ENTITY_MEMBER_LIST_VERTICAL_PADDING}px 0;
`;

class CanvasEntity extends Component<Props, State> {
  rootNode: HTMLDivElement | null = null;

  constructor(props: Readonly<Props>) {
    super(props);
    this.state = {
      isMouseOverEntity: false,
      isMouseOverEntityName: false,
      entityWidth: props.entity.bounds.width,

      hover: false,
      selected: false,
      moving: false,
      bounds: { ...props.entity.bounds },
    };
  }

  componentDidMount() {
    if (this.props.editorMode === EditorMode.ModelingView) {
      document.addEventListener('mousemove', this.onMouseMove);
    }
    document.addEventListener('mouseup', this.onMouseUp);
  }

  componentWillReceiveProps(newProps: Props) {
    this.setState({ entityWidth: newProps.entity.bounds.width });
  }

  componentWillUnmount() {
    if (this.props.editorMode === EditorMode.ModelingView) {
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
      const x = event.pageX - this.state.offset!.x;
      const y = event.pageY - this.state.offset!.y;

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
  };

  onMouseUp = (event: MouseEvent) => {
    const element: Entity = {
      ...this.props.entity,
      selected: event.shiftKey ? this.state.selected : this.state.hover,
    };

    this.setState({
      moving: false,
      selected: element.selected,
    });
    this.props.update(element);
  };

  toggleEntityInteractiveElement = () => {
    const { entity, interactiveElementIds } = this.props;

    // We don't want to react to clicks on this entity if the entity currently isn't interactive
    // and the user clicked somethere on the entity outside of the entity name area (e.g. on padding areas)
    if (
      !interactiveElementIds.has(entity.id) &&
      !this.state.isMouseOverEntityName
    ) {
      return;
    }

    const interactiveMemberIdsOfEntity = [
      ...entity.attributes.map(attr => attr.id),
      ...entity.methods.map(method => method.id),
    ].filter(id => interactiveElementIds.has(id));

    this.props.onToggleInteractiveElements(
      entity.id,
      ...interactiveMemberIdsOfEntity
    );
  };

  onResizeBegin = () => {
    this.props.onChangeIsResizing(true);
  };

  onResizeMove = (dx: number) => {
    this.setState({
      entityWidth: Math.max(this.props.entity.bounds.width + dx, 100),
    });
  };

  onResizeEnd = (dx: number) => {
    const newWidth = Math.max(this.props.entity.bounds.width + dx, 100);
    this.setState({ entityWidth: newWidth });
    this.props.onChangeIsResizing(false);

    if (dx !== 0) {
      this.props.updateEntityWidth(newWidth);
    }
  };

  render() {
    const {
      entity,
      apollonMode,
      editorMode,
      interactiveElementIds,
    } = this.props;
    const connectDragSource = (e: any) => e;

    const { attributes, methods, renderMode } = entity;

    const containerStyle = this.computeContainerStyle();

    const onMouseDown =
      editorMode === EditorMode.ModelingView ? this.onMouseDown : undefined;

    const onClick =
      editorMode === EditorMode.InteractiveElementsView
        ? this.toggleEntityInteractiveElement
        : undefined;

    const specialElement =
      entity.kind === EntityKind.ActivityControlInitialNode ||
      entity.kind === EntityKind.ActivityControlFinalNode ||
      entity.kind === EntityKind.ActivityMergeNode ||
      entity.kind === EntityKind.ActivityForkNode ||
      entity.kind === EntityKind.ActivityForkNodeHorizontal;

    const hidePopup =
      entity.kind === EntityKind.ActivityControlInitialNode ||
      entity.kind === EntityKind.ActivityControlFinalNode ||
      entity.kind === EntityKind.ActivityForkNode ||
      entity.kind === EntityKind.ActivityForkNodeHorizontal;

    const entityDiv = (
      <div
        ref={ref => (this.rootNode = ref)}
        id={`entity-${entity.id}`}
        style={containerStyle}
        onMouseDown={onMouseDown}
        onClick={onClick}
        onDoubleClick={
          apollonMode === ApollonMode.ReadOnly || hidePopup
            ? undefined
            : this.props.openDetailsPopup
        }
        onMouseOver={e => {
          this.onMouseOver(e);
          this.setState({
            isMouseOverEntityName: true,
            isMouseOverEntity: true,
          });
        }}
        onMouseLeave={e => {
          this.onMouseLeave(e);
          this.setState({
            isMouseOverEntityName: false,
            isMouseOverEntity: false,
          });
        }}
      >
        {!hidePopup && (
          <Name
            entity={entity}
            onMouseEnter={() => {
              this.setState({ isMouseOverEntityName: true });
            }}
            onMouseLeave={() => {
              this.setState({ isMouseOverEntityName: false });
            }}
          />
        )}

        {renderMode.showAttributes && (
          <MemberList>
            {attributes.map(attribute => (
              <Member
                key={attribute.id}
                entityId={entity.id}
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
            ))}
          </MemberList>
        )}

        {renderMode.showMethods && (
          <MemberList>
            {methods.map(method => (
              <Member
                key={method.id}
                entityId={entity.id}
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
            ))}
          </MemberList>
        )}

        {apollonMode !== ApollonMode.ReadOnly && !specialElement && (
          <ResizeHandle
            initialWidth={entity.bounds.width}
            gridSize={this.props.gridSize}
            onResizeBegin={this.onResizeBegin}
            onResizeMove={this.onResizeMove}
            onResizeEnd={this.onResizeEnd}
          />
        )}

        {specialElement && this.computeChild()}
      </div>
    );

    return editorMode === EditorMode.ModelingView
      ? connectDragSource(entityDiv)
      : entityDiv;
  }

  computeContainerStyle(): React.CSSProperties {
    const {
      entity,
      apollonMode,
      editorMode,
      interactiveElementIds,
      interactiveElementsMode,
    } = this.props;
    const isDragging = false;

    const isInteractiveElement = interactiveElementIds.has(entity.id);

    const visibility =
      isInteractiveElement &&
      interactiveElementsMode === InteractiveElementsMode.Hidden
        ? 'hidden'
        : undefined;

    const hasContainer =
      entity.kind !== EntityKind.ActivityControlInitialNode &&
      entity.kind !== EntityKind.ActivityControlFinalNode &&
      entity.kind !== EntityKind.ActivityMergeNode;

    const { x, y } = this.state.bounds;

    const baseProperties: React.CSSProperties = {
      position: 'absolute',
      left: x,
      top: y,
      width: this.state.entityWidth,
      height: computeEntityHeight(
        entity.kind,
        entity.attributes.length,
        entity.methods.length,
        entity.renderMode
      ),
      visibility,
      opacity: isDragging ? 0.35 : 1,
      cursor:
        apollonMode !== ApollonMode.ReadOnly &&
        editorMode === EditorMode.ModelingView
          ? 'move'
          : 'default',
      zIndex: 8000,
    };

    if (!hasContainer) {
      return {
        ...baseProperties,
        filter: this.computeDropShadow(),
      };
    }
    return {
      ...baseProperties,
      borderRadius: entity.kind === EntityKind.ActivityActionNode ? 10 : 0,
      border: '1px solid black',
      backgroundColor: 'white',
      backgroundImage: this.computeContainerBackgroundImage(
        isInteractiveElement
      ),
      boxShadow: this.computeContainerBoxShadow(),
    };
  }

  computeContainerBackgroundImage(isInteractiveElement: boolean) {
    const { editorMode, theme } = this.props;
    const { isMouseOverEntity, isMouseOverEntityName } = this.state;

    let backgroundColor: string | null = null;

    if (editorMode === EditorMode.InteractiveElementsView) {
      if (isInteractiveElement) {
        backgroundColor = isMouseOverEntity
          ? theme.interactiveAreaHoverColor
          : theme.interactiveAreaColor;
      } else if (isMouseOverEntityName) {
        backgroundColor = theme.interactiveAreaHoverColor;
      }
    }

    return backgroundColor === null
      ? 'none'
      : `linear-gradient(${backgroundColor}, ${backgroundColor})`;
  }

  computeContainerBoxShadow() {
    const { entity, selection, theme, editorMode } = this.props;
    const isDragging = false;
    const { isMouseOverEntity } = this.state;

    const isSelected = selection.entityIds.includes(entity.id);

    switch (editorMode) {
      case EditorMode.ModelingView:
        return isMouseOverEntity || isSelected || isDragging
          ? `0 0 0 4px ${theme.highlightColor}`
          : 'none';

      default:
        return 'none';
    }
  }

  computeDropShadow() {
    const { entity, selection, theme, editorMode } = this.props;
    const isDragging = false;
    const { isMouseOverEntity } = this.state;

    const isSelected = selection.entityIds.includes(entity.id);

    switch (editorMode) {
      case EditorMode.ModelingView:
        return isMouseOverEntity || isSelected || isDragging
          ? `drop-shadow(0 0 4px ${theme.highlightColorDarker})`
          : 'none';

      default:
        return 'none';
    }
  }

  computeChild() {
    const {
      entity,
      apollonMode,
      editorMode,
      interactiveElementIds,
      interactiveElementsMode,
    } = this.props;
    const isDragging = false;

    const color =
      editorMode === EditorMode.InteractiveElementsView &&
      interactiveElementIds.has(entity.id)
        ? 'rgba(0, 220, 0, 0.3)'
        : 'black';

    if (entity.kind === EntityKind.ActivityControlInitialNode) {
      return (
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <circle cx="50" cy="50" r="50" fill={color} />
        </svg>
      );
    }
    if (entity.kind === EntityKind.ActivityControlFinalNode) {
      return (
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <circle
            cx="50"
            cy="50"
            r="49"
            fill="transparent"
            stroke={color}
            strokeWidth="2"
          />
          <circle cx="50" cy="50" r="40" fill={color} />
        </svg>
      );
    }
    if (entity.kind === EntityKind.ActivityMergeNode) {
      return (
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <polyline
            points="50 0, 100 50, 50 100, 0 50, 50 0"
            fill="white"
            stroke={color}
            strokeWidth="2"
          />
        </svg>
      );
    }
    if (
      entity.kind === EntityKind.ActivityForkNode ||
      entity.kind === EntityKind.ActivityForkNodeHorizontal
    ) {
      return (
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <rect x="0" y="0" width="100" height="100" fill={color} />
        </svg>
      );
    }
  }
}

interface OwnProps {
  entity: Entity;
  apollonMode: ApollonMode;
  editorMode: EditorMode;
  interactiveElementsMode: InteractiveElementsMode;
  selection: ElementSelection;
  gridSize: number;
  updateEntityWidth: (newWidth: number) => void;
  openDetailsPopup: () => void;
  onChangeIsResizing: (isResizing: boolean) => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp: () => void;
  onStartDragging: () => void;
  onEndDragging: () => void;
  interactiveElementIds: ReadonlySet<UUID>;
  onToggleInteractiveElements: (...ids: UUID[]) => void;
}

interface DispatchProps {
  update: typeof ElementRepository.update;
  moveEntity: typeof moveEntity;
}

interface ThemeProps {
  theme: Theme;
}

type Props = OwnProps & ThemeProps & DispatchProps;

interface State {
  isMouseOverEntity: boolean;
  isMouseOverEntityName: boolean;
  entityWidth: number;

  hover: boolean;
  selected: boolean;
  moving: boolean;
  bounds: { x: number; y: number; width: number; height: number };
  offset?: { x: number; y: number };
}

export default compose<ComponentClass<OwnProps>>(
  withTheme,
  connect(
    null,
    { update: ElementRepository.update, moveEntity }
  )
)(CanvasEntity);
