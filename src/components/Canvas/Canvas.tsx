import React, { createRef, RefObject } from 'react';
import { connect } from 'react-redux';
import Entity from './../LayoutedElement';
import Grid from './Grid';
import EntityDetailsPopup from './../Popups/EntityDetailsPopup';
import RelationshipDetailsPopup from './../Popups/RelationshipDetailsPopup';
import {
  getAllInteractiveElementIds,
  getAllLayoutedRelationships,
  toggleInteractiveElements,
} from './../../gui/redux';
import {
  ApollonMode,
  DiagramType,
  EditorMode,
  InteractiveElementsMode,
} from '../../services/EditorService';
import { ElementSelection } from '../../Editor';
import * as UML from './../../core/domain';
import Element, { ElementRepository } from './../../domain/Element';
import { UUID } from './../../domain/utils/uuid';
import RelationshipMarkers from './../../rendering/renderers/svg/defs/RelationshipMarkers';
import Relationship from './../LayoutedRelationship';
import Droppable from './../DragDrop/Droppable';

import { State as ReduxState } from './../Store';
import RelationshipProvider from '../LayoutedRelationship/RelationshipLayer';

class Canvas extends React.Component<Props, State> {
  container: RefObject<HTMLDivElement> = createRef();

  state: State = {
    doubleClickedElement: { type: 'none' },
    displayRelationships: false,
  };

  componentDidMount() {
    this.container.current &&
      this.container.current.addEventListener(
        'keydown',
        this.handleKeyDownEvent
      );
  }

  componentWillUnmount() {
    this.container.current &&
      this.container.current.removeEventListener(
        'keydown',
        this.handleKeyDownEvent
      );
  }

  displayRelationships = () => {
    this.setState({ displayRelationships: true });
  };

  private handleKeyDownEvent = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Backspace':
      case 'Delete':
        const find = (e: Element[]): Element[] => {
          const t: Element[] = e.reduce<Element[]>((o, e) => [...o, ...find(e.ownedElements)], []);
          return [...e, ...t];
        }
        find(this.props.elements).filter(e => e.selected).forEach(this.props.delete);
        break;
    }
  };

  render() {
    const {
      canvasSize,
      gridSize,
      elements,
      relationships,
      interactiveElementsMode,
    } = this.props;
    const { width, height } = canvasSize;

    const { selection } = this.props;

    return (
      <div ref={this.container} tabIndex={0}>
        <Droppable container={this.container}>
          <Grid grid={gridSize} width={width} height={height}>
            <RelationshipProvider>
              <svg width={width} height={height}>
                <defs>
                  <RelationshipMarkers
                    onComponentDidMount={this.displayRelationships}
                  />
                </defs>

                {elements.map(
                  element => (
                      <Entity
                        key={element.id}
                        element={element}
                        container={this.container}
                        openDetailsPopup={(id: string) => {
                          this.setState({
                            doubleClickedElement: {
                              type: 'entity',
                              entityId: id,
                            },
                          });
                        }}
                      />
                    )
                )}
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
              </svg>
            </RelationshipProvider>

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
        const find = (elements: Element[], id: string): Element | null => {
            if (!elements.length) return null;

            const element = elements.find(e => e.id === id);
            if (element) return element;

            const children = elements.reduce<Element[]>((a, e) => [ ...a, ...e.ownedElements], []);
            return find(children, id);
        }
        const doubleClickedEntity = find(this.props.elements, doubleClickedElement.entityId);

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
  delete: typeof ElementRepository.delete;
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
    interactiveElementsMode: state.editor.interactiveMode,
    interactiveElementIds: getAllInteractiveElementIds(state),
    diagramType: state.editor.diagramType,
    apollonMode: state.editor.mode,
    editorMode: state.editor.editorMode,
    selection: {
      entityIds: Object.keys(state.elements)
        .filter(k => state.elements[k].selected)
        .filter(
          s => !Object.keys(state.relationships.byId).includes(s)
        ) as UUID[],
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
