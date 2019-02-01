import React, { ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withTheme } from 'styled-components';
import { Styles as Theme } from './../Theme';
import { State as ReduxState } from './../Store';
import {
  ApollonMode,
  EditorMode,
  InteractiveElementsMode,
} from '../../services/EditorService';
import { LayoutedRelationship as Relationship } from './../../domain/Relationship';
import { getMarkerIdForRelationshipKind } from './../../rendering/renderers/svg/defs/RelationshipMarkers';
import RelationshipLabels from './../../rendering/renderers/svg/RelationshipLabels';
import { getSvgDasharrayForRelationshipKind } from './../../rendering/renderers/svg/RenderedRelationship';
import { ElementRepository } from './../../domain/Element';
import { UUID } from '../../domain/utils/uuid';
import { ElementSelection } from '../../Editor';
import {
  getAllInteractiveElementIds,
  toggleInteractiveElements,
  getbyId,
} from '../../services/redux';
import { withCanvas, CanvasContext } from '../Canvas';
import { PopupConsumer, withPopup, PopupContext } from '../Popup/PopupContext';

class LayoutedRelationship extends React.Component<Props, State> {
  state: State = {
    relationship: this.props.getById(this.props.relationship),
    isMouseOver: false,
    hover: false,
    selected: false,
  };

  componentDidMount() {
    this.props.container.current &&
      this.props.container.current.addEventListener('mouseup', this.onMouseUp);
  }

  componentWillUnmount() {
    this.props.container.current &&
      this.props.container.current.removeEventListener(
        'mouseup',
        this.onMouseUp
      );
  }

  componentDidUpdate(prevProps: Props) {
      const rel = this.props.getById(this.props.relationship);
      if (this.state.relationship !== rel) {
        this.setState({ relationship: rel }, () =>
          this.props.updateRelationship(rel)
        );
      }
    }

  // componentDidUpdate(prevProps: Props, prevState: State) {
  //   if (prevProps !== this.props) {
  //     console.log('update')
  //     this.state.relationship = this.props.getById(this.props.relationship);
  //   }
  // }

  private onMouseOver = (event: React.MouseEvent) => {
    this.setState({ hover: true });
  };

  private onMouseLeave = (event: React.MouseEvent) => {
    this.setState({ hover: false });
  };

  onMouseDown = (e: React.MouseEvent<SVGPolylineElement>) => {
    e.stopPropagation();

    switch (this.props.editorMode) {
      case EditorMode.ModelingView:
        const relationship = this.state.relationship.relationship;
        if (e.shiftKey) {
          relationship.selected = !relationship.selected;
        } else {
          relationship.selected = true;
        }
        this.setState(
          state => ({ selected: relationship.selected }),
          () => this.props.update(relationship)
        );
        break;

      case EditorMode.InteractiveElementsView:
        this.props.toggleInteractiveElements(
          this.state.relationship.relationship.id
        );
        break;
    }
  };

  onMouseUp = (event: MouseEvent) => {
    if (!event.shiftKey) {
      if (!this.state.hover && this.state.selected) {
        const relationship = this.state.relationship.relationship;
        relationship.selected = false;
        this.props.update(relationship);
      }
      this.setState((state, props) => ({
        selected: state.hover,
      }));
    }
  };

  isSelected = (): boolean => {
    return this.props.selection.relationshipIds.includes(
      this.state.relationship.relationship.id
    );
  };

  isInteractiveElement = (): boolean => {
    return this.props.interactiveElementIds.has(
      this.state.relationship.relationship.id
    );
  };

  render() {
    const { apollonMode, editorMode, interactiveElementsMode } = this.props;

    const visibility =
      editorMode === EditorMode.ModelingView ||
      interactiveElementsMode !== InteractiveElementsMode.Hidden ||
      !this.isInteractiveElement()
        ? undefined
        : 'hidden';

    const { relationship, path } = this.state.relationship;

    const polylinePoints = path
      .map(p => this.props.coordinateSystem.pointToScreen(p.x, p.y))
      .map(point => `${point.x} ${point.y}`)
      .join(',');

    const markerId = getMarkerIdForRelationshipKind(relationship.kind);
    const markerEnd = markerId === null ? undefined : `url(#${markerId})`;

    const outlineStroke = this.computeOutlineStroke();
    const strokeDasharray = getSvgDasharrayForRelationshipKind(
      relationship.kind
    );

    return (
      <PopupConsumer>
        {context =>
          context && (
            <>
              <RelationshipLabels
                relationship={relationship}
                relationshipPath={path}
                coordinateSystem={this.props.coordinateSystem}
              />
              <polyline
                points={polylinePoints}
                strokeWidth="15"
                stroke={outlineStroke}
                fill="none"
                onMouseDown={this.onMouseDown}
                onMouseEnter={e => {
                  this.onMouseOver(e);
                  this.setState({ isMouseOver: true });
                }}
                onMouseLeave={e => {
                  this.onMouseLeave(e);
                  this.setState({ isMouseOver: false });
                }}
                onDoubleClick={
                  apollonMode === ApollonMode.ReadOnly
                    ? undefined
                    : () => context.showRelationshipPopup(this.state.relationship)
                }
                style={{ visibility }}
              />
              <polyline
                points={polylinePoints}
                strokeWidth="1"
                stroke="black"
                strokeDasharray={strokeDasharray}
                fill="none"
                markerEnd={markerEnd}
                pointerEvents="none"
                style={{ visibility }}
              />
            </>
          )
        }
      </PopupConsumer>
    );
  }

  computeOutlineStroke() {
    const { editorMode, theme } = this.props;
    const { isMouseOver } = this.state;

    if (editorMode === EditorMode.InteractiveElementsView) {
      if (isMouseOver) {
        return theme.interactiveAreaHoverColor;
      }

      if (this.isInteractiveElement()) {
        return theme.interactiveAreaColor;
      }

      return 'transparent';
    }

    return isMouseOver || this.isSelected()
      ? theme.highlightColor
      : 'transparent';
  }
}

interface OwnProps {
  relationship: string;
  container: React.RefObject<HTMLDivElement>;
}

interface ThemeProps {
  theme: Theme;
}

interface StateProps {
  getById: (id: string) => Relationship;
  apollonMode: ApollonMode;
  editorMode: EditorMode;
  interactiveElementsMode: InteractiveElementsMode;
  interactiveElementIds: ReadonlySet<UUID>;
  selection: ElementSelection;
}

interface DispatchProps {
  toggleInteractiveElements: typeof toggleInteractiveElements;
  update: typeof ElementRepository.update;
}

type Props = OwnProps & ThemeProps & StateProps & DispatchProps & CanvasContext & PopupContext;

interface State {
  relationship: Relationship;
  isMouseOver: boolean;
  hover: boolean;
  selected: boolean;
}

const mapStateToProps = (state: ReduxState): StateProps => ({
  getById: (id: string) => getbyId(state, id),
  apollonMode: state.editor.mode,
  editorMode: state.editor.editorMode,
  interactiveElementsMode: state.editor.interactiveMode,
  interactiveElementIds: getAllInteractiveElementIds(state),
  selection: {
    entityIds: Object.keys(state.elements)
      .filter(k => state.elements[k].selected)
      .filter(
        s => !Object.keys(state.relationships.byId).includes(s)
      ) as UUID[],
    relationshipIds: Object.keys(state.elements)
      .filter(k => state.elements[k].selected)
      .filter(s => Object.keys(state.relationships.byId).includes(s)) as UUID[],
  },
});

export default compose<ComponentClass<OwnProps>>(
  withCanvas,
  withTheme,
  withPopup,
  connect(
    mapStateToProps,
    {
      toggleInteractiveElements,
      update: ElementRepository.update,
    }
  )
)(LayoutedRelationship);
