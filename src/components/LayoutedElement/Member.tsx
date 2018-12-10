import React, { Component } from 'react';
import { withTheme } from 'styled-components';
import { Styles as Theme } from './../Theme';
import {
  EditorMode,
  InteractiveElementsMode,
} from '../../domain/Options/types';
import { EntityMember, Entity } from './../../core/domain';
import { ENTITY_MEMBER_HEIGHT } from './../../rendering/layouters/entity';

class Member extends Component<Props, State> {
  state: State = {
    isMouseOver: false,
  };

  toggleInteractiveElements = (e: React.MouseEvent) => {
    e.stopPropagation();
    this.props.onToggleInteractiveElements();
  };

  render() {
    const {
      editorMode,
      canBeMadeInteractive,
      isInteractiveElement,
      interactiveElementsMode,
    } = this.props;

    const visibility =
      editorMode === EditorMode.ModelingView || interactiveElementsMode !== InteractiveElementsMode.Hidden || !isInteractiveElement
        ? undefined
        : 'hidden';

    const onClick =
      editorMode === EditorMode.InteractiveElementsView && canBeMadeInteractive
        ? this.toggleInteractiveElements
        : undefined;

    return (
      <svg
        x="0"
        y={this.props.y}
        width={this.props.entity.bounds.width}
        height={ENTITY_MEMBER_HEIGHT}
        onClick={onClick}
        onMouseEnter={() => this.setState({ isMouseOver: true })}
        onMouseLeave={() => this.setState({ isMouseOver: false })}
        style={{ overflow: 'visible', visibility }}
        fill="black"
      >
        <rect
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill={
            this.props.editorMode === EditorMode.InteractiveElementsView &&
            (this.state.isMouseOver || isInteractiveElement)
              ? this.props.canBeMadeInteractive
                ? this.props.theme.interactiveAreaHoverColor
                : this.props.theme.interactiveAreaColor
              : 'none'
          }
        />
        <text x={20} y="50%" dominantBaseline="middle">
          {this.props.member.name}
        </text>
      </svg>
    );
  }
}

interface Props {
  y: number;
  entity: Entity;
  member: EntityMember;
  theme: Theme;
  editorMode: EditorMode;
  canBeMadeInteractive: boolean;
  isInteractiveElement: boolean;
  interactiveElementsMode: InteractiveElementsMode;
  onToggleInteractiveElements: () => void;
}

interface State {
  isMouseOver: boolean;
}

export default withTheme(Member);
