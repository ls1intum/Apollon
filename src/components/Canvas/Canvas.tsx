import React, { createRef, RefObject } from 'react';
import { connect } from 'react-redux';
import Entity from './../LayoutedElement';
import Grid from './Grid';
import EntityDetailsPopup from './../Popups/EntityDetailsPopup';
import RelationshipDetailsPopup from './../Popups/RelationshipDetailsPopup';
import RelationshipConnectors from './RelationshipConnectors';
import {
  getAllEntities,
  getAllInteractiveElementIds,
  getAllLayoutedRelationships,
  toggleInteractiveElements,
} from './../../gui/redux';
import {
  ApollonMode,
  DiagramType,
  EditorMode,
  ElementSelection,
  InteractiveElementsMode,
} from '../../domain/Options/types';
import * as UML from './../../core/domain';
import Element, { ElementRepository } from './../../domain/Element';
import { UUID } from './../../domain/utils/uuid';
import RelationshipMarkers from './../../rendering/renderers/svg/defs/RelationshipMarkers';
import Relationship from './../LayoutedRelationship';
import Droppable from './../DragDrop/Droppable';

import { State as ReduxState } from './../Store';

class Canvas extends React.Component<Props, State> {
  container: RefObject<HTMLDivElement> = createRef();

  state: State = {
    doubleClickedElement: { type: 'none' },
    displayRelationships: false,
  };

  componentDidMount() {
    this.container.current && this.container.current.addEventListener('keydown', this.handleKeyDownEvent);
  }

  componentWillUnmount() {
    this.container.current && this.container.current.removeEventListener('keydown', this.handleKeyDownEvent);
  }

  displayRelationships = () => {
    this.setState({ displayRelationships: true });
  };

  private handleKeyDownEvent = (event: KeyboardEvent) => {
    switch (event.key) {
      case "Backspace":
      case "Delete":
        this.props.elements.filter(e => e.selected).forEach(this.props.delete);
        break
    }
  }

  render() {
    const {
      canvasSize,
      gridSize,
      elements,
      relationships,
      diagramType,
      apollonMode,
      editorMode,
      interactiveElementsMode,
    } = this.props;
    const { width, height } = canvasSize;

    const { selection } = this.props;

    return (
      <div ref={this.container} tabIndex={0}>
        <Droppable container={this.container}>
          <Grid grid={gridSize} width={width} height={height}>
            <svg width={canvasSize.width} height={canvasSize.height}>
              <defs>
                <RelationshipMarkers
                  onComponentDidMount={this.displayRelationships}
                />
              </defs>
              {this.state.displayRelationships &&
                relationships.map(relationship => {
                  const relationshipId = relationship.relationship.id;
                  return (
                    <Relationship
                      key={relationshipId}
                      relationship={relationship}
                      container={this.container}
                      apollonMode={this.props.apollonMode}
                      editorMode={this.props.editorMode}
                      interactiveElementsMode={interactiveElementsMode}
                      isSelected={selection.relationshipIds.includes(
                        relationshipId
                      )}
                      onSelect={() => {}}
                      onToggleSelection={() => {}}
                      isInteractiveElement={this.props.interactiveElementIds.has(
                        relationshipId
                      )}
                      onToggleInteractiveElements={
                        this.props.toggleInteractiveElements
                      }
                      openDetailsPopup={() => {
                        this.setState({
                          doubleClickedElement: {
                            type: 'relationship',
                            relationshipId,
                          },
                        });
                      }}
                    />
                  );
                })}

              {elements.map(
                element =>
                  (this.props.editorMode === EditorMode.ModelingView ||
                    this.props.interactiveElementsMode !==
                      InteractiveElementsMode.Hidden ||
                    !this.props.interactiveElementIds.has(element.id)) && (
                    <Entity
                      key={element.id}
                      entity={element}
                      container={this.container}
                      openDetailsPopup={() => {
                        this.setState({
                          doubleClickedElement: {
                            type: 'entity',
                            entityId: element.id,
                          },
                        });
                      }}
                    />
                  )
              )}
            </svg>

            {apollonMode !== ApollonMode.ReadOnly && (
              <RelationshipConnectors
                diagramType={diagramType}
                editorMode={editorMode}
                selection={selection}
                showConnectors={this.state.doubleClickedElement.type === 'none'}
              />
            )}

            {this.renderDetailsPopup()}
          </Grid>
        </Droppable>
      </div>
    );
  }

  renderDetailsPopup() {
    const { doubleClickedElement } = this.state;

    switch (doubleClickedElement.type) {
      case 'entity': {
        const doubleClickedEntity = this.props.elements.find(
          element => element.id === doubleClickedElement.entityId
        );

        return doubleClickedEntity ? (
          <EntityDetailsPopup
            entity={doubleClickedEntity}
            onRequestClose={() => {
              this.setState({ doubleClickedElement: { type: 'none' } });
            }}
            canvasScrollContainer={
              this.container.current!.parentElement! as HTMLDivElement
            }
          />
        ) : null;
      }

      case 'relationship': {
        const doubleClickedRelationship = this.props.relationships.find(
          rel => rel.relationship.id === doubleClickedElement.relationshipId
        );

        return (
          doubleClickedRelationship && (
            <RelationshipDetailsPopup
              diagramType={this.props.diagramType}
              relationship={doubleClickedRelationship}
              onRequestClose={() => {
                this.setState({ doubleClickedElement: { type: 'none' } });
              }}
              canvasScrollContainer={
                this.container.current!.parentElement! as HTMLDivElement
              }
            />
          )
        );
      }

      default:
        return null;
    }
  }
}

interface OwnProps {}

interface StateProps {
  elements: Element[];
  relationships: UML.LayoutedRelationship[];
  canvasSize: { width: number; height: number };
  gridSize: number;
  interactiveElementsMode: InteractiveElementsMode;
  interactiveElementIds: ReadonlySet<UUID>;
  diagramType: DiagramType;
  apollonMode: ApollonMode;
  editorMode: EditorMode;
  selection: ElementSelection;
}

interface DispatchProps {
  toggleInteractiveElements: typeof toggleInteractiveElements;
  delete: typeof ElementRepository.delete,
}

type Props = OwnProps & StateProps & DispatchProps;

interface State {
  doubleClickedElement:
    | { type: 'entity'; entityId: UUID }
    | { type: 'relationship'; relationshipId: UUID }
    | { type: 'none' };
  displayRelationships: boolean;
}

function mapStateToProps(state: ReduxState): StateProps {
  return {
    elements: ElementRepository.read(state),
    relationships: getAllLayoutedRelationships(state),
    canvasSize: state.editor.canvasSize,
    gridSize: state.editor.gridSize,
    interactiveElementsMode: state.options.interactiveMode,
    interactiveElementIds: getAllInteractiveElementIds(state),
    diagramType: state.options.diagramType,
    apollonMode: state.options.mode,
    editorMode: state.options.editorMode,
    selection: {
      entityIds: Object.keys(state.elements)
        .filter(k => state.elements[k].selected)
        .filter(s => Object.keys(state.entities.byId).includes(s)) as UUID[],
      relationshipIds: Object.keys(state.elements)
        .filter(k => state.elements[k].selected)
        .filter(s =>
          Object.keys(state.relationships.byId).includes(s)
        ) as UUID[],
    },
  };
}

export default connect<StateProps, DispatchProps, OwnProps, ReduxState>(
  mapStateToProps,
  {
    toggleInteractiveElements,
    delete: ElementRepository.delete,
  }
)(Canvas);
