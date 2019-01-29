import { State as ReduxState } from './../../components/Store';
import {
  ExternalState,
  Entity,
  EntityKind,
  EntityMember,
  Relationship as ExternalRelationship,
} from './ExternalState';
import Container from '../../domain/Container';
import Relationship from '../../domain/Relationship';
import {
  EditorMode,
  InteractiveElementsMode,
  ApollonMode,
} from '../EditorService';
import Diagram, { DiagramType } from '../../domain/Diagram';
import Element from '../../domain/Element';
import * as Plugins from './../../domain/plugins';
import { Attribute, Method } from './../../domain/plugins';

export const mapInternalToExternalState = (
  state: ReduxState
): ExternalState => ({
  entities: {
    allIds: Object.keys(state.elements).filter(
      id =>
        state.elements[id].name !== 'Relationship' &&
        state.elements[id].kind !== 'Attribute' &&
        state.elements[id].kind !== 'Method'
    ),
    byId: Object.keys(state.elements)
      .filter(
        id =>
          state.elements[id].name !== 'Relationship' &&
          state.elements[id].kind !== 'Attribute' &&
          state.elements[id].kind !== 'Method'
      )
      .map<Entity>(id => ({
        id: state.elements[id].id,
        kind: mapInternalToExternalKind(state.elements[id].kind) as EntityKind,
        name: state.elements[id].name,
        position: {
          x: state.elements[id].bounds.x + state.diagram.bounds.width / 2,
          y: state.elements[id].bounds.y + state.diagram.bounds.height / 2,
        },
        size: {
          width: state.elements[id].bounds.width,
          height: state.elements[id].bounds.height,
        },
        attributes:
          'ownedElements' in state.elements[id]
            ? (state.elements[id] as Container).ownedElements
                .filter(id => state.elements[id].kind === 'Attribute')
                .map<EntityMember>((id: string) => ({
                  id,
                  name: state.elements[id].name,
                }))
            : [],
        methods:
          'ownedElements' in state.elements[id]
            ? (state.elements[id] as Container).ownedElements
                .filter(id => state.elements[id].kind === 'Method')
                .map<EntityMember>((id: string) => ({
                  id,
                  name: state.elements[id].name,
                }))
            : [],
        renderMode: {
          showAttributes: true,
          showMethods: true,
        },
      }))
      .reduce(
        (o: { [id: string]: Entity }, e: Entity) => ({ ...o, [e.id]: e }),
        {}
      ),
  },

  relationships: {
    allIds: state.relationships.allIds,
    byId: Object.keys(state.relationships.byId)
      .map<ExternalRelationship>(id => state.relationships.byId[id])
      .reduce(
        (
          o: { [id: string]: ExternalRelationship },
          r: ExternalRelationship
        ) => ({
          ...o,
          [r.id]: r,
        }),
        {}
      ),
  },

  interactiveElements: {
    allIds: [
      ...state.interactiveElements.allIds,
      ...Object.values(state.elements)
        .filter(e => e.interactive)
        .map(e => e.id),
    ],
  },

  editor: {
    canvasSize: {
      width: state.diagram.bounds.width,
      height: state.diagram.bounds.height,
    },
    gridSize: state.editor.gridSize,
  },
});

export const mapExternalToInternalState = (
  state: ExternalState | undefined,
  type: DiagramType = DiagramType.ClassDiagram,
  editorMode: EditorMode = EditorMode.ModelingView,
  interactiveMode: InteractiveElementsMode = InteractiveElementsMode.Highlighted,
  mode: ApollonMode = ApollonMode.ReadOnly
): ReduxState => ({
  relationships: {
    allIds: state ? state.relationships.allIds : [],
    byId: state
      ? Object.keys(state.relationships.byId)
          .map<Relationship>(id => ({
            ...state.relationships.byId[id],
            name: 'Relationship',
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            selected: false,
            interactive: false,
            owner: null,
          }))
          .reduce(
            (o: { [id: string]: Relationship }, r: Relationship) => ({
              ...o,
              [r.id]: r,
            }),
            {}
          )
      : {},
  },

  interactiveElements: {
    allIds: state
      ? state.interactiveElements.allIds.filter(
          id => id in state.relationships.byId
        )
      : [],
  },

  elements: state
    ? state.entities.allIds
        .reduce<Element[]>((o: Element[], id: string) => {
          const kind = mapExternalToInternalKind(state.entities.byId[id].kind);
          let current: Element[] = [];
          let element = {
            ...new (Plugins as any)[kind](
              state.entities.byId[id].name
            ),
            id,
            bounds: {
              x:
                state.entities.byId[id].position.x -
                state.editor.canvasSize.width / 2,
              y:
                state.entities.byId[id].position.y -
                state.editor.canvasSize.height / 2,
              ...state.entities.byId[id].size,
            },
            selected: false,
            interactive: state.interactiveElements.allIds.includes(id),
          };
          element = Object.setPrototypeOf(
            element,
            (<any>Plugins)[element.kind].prototype
          );
          if (
            ['Class', 'AbstractClass', 'Enumeration', 'Interface'].includes(
              element.kind
            )
          ) {
            const container = element as Container;
            for (const a of state.entities.byId[id].attributes) {
              const attr: Attribute = Object.setPrototypeOf(
                {
                  ...new Attribute(a.name),
                  id: a.id,
                  interactive: state.interactiveElements.allIds.includes(a.id),
                },
                Attribute.prototype
              );
              let [parent, ...children] = container.addElement(attr, current);
              element = parent;
              current = children;
            }
            for (const m of state.entities.byId[id].methods) {
              const method: Method = Object.setPrototypeOf(
                {
                  ...new Method(m.name),
                  id: m.id,
                  interactive: state.interactiveElements.allIds.includes(m.id),
                },
                Method.prototype
              );
              let [parent, ...children] = container.addElement(method, current);
              element = parent;
              current = children;
            }
          }
          return [...o, element, ...current];
        }, [])
        .reduce(
          (o: { [id: string]: Element }, e: Element) => ({
            ...o,
            [e.id]: e,
          }),
          {}
        )
    : {},

  editor: {
    gridSize: state ? state.editor.gridSize : 10,
    editorMode,
    interactiveMode,
    mode,
  },
  diagram: {
    ...new Diagram(type),
    ...(state && {
      ownedElements: state.entities.allIds,
      ownedRelationships: state.relationships.allIds,
      bounds: {
        x: 0,
        y: 0,
        width: state.editor.canvasSize.width,
        height: state.editor.canvasSize.height,
      },
    }),
  },
});

export const mapInternalToExternalKind = (kind: string): string => {
  switch (kind) {
    case 'Class': return 'CLASS';
    case 'AbstractClass': return 'ABSTRACT_CLASS';
    case 'Enumeration': return 'ENUMERATION';
    case 'Interface': return 'INTERFACE';
    case 'InitialNode': return 'ACTIVITY_CONTROL_INITIAL_NODE';
    case 'FinalNode': return 'ACTIVITY_CONTROL_FINAL_NODE';
    case 'ActionNode': return 'ACTIVITY_ACTION_NODE';
    case 'ObjectNode': return 'ACTIVITY_OBJECT';
    case 'MergeNode': return 'ACTIVITY_MERGE_NODE';
    case 'ForkNode': return 'ACTIVITY_FORK_NODE';
    default: return '';
  }
}

export const mapExternalToInternalKind = (kind: string): string => {
  switch (kind) {
    case 'CLASS': return 'Class';
    case 'ABSTRACT_CLASS': return 'AbstractClass';
    case 'ENUMERATION': return 'Enumeration';
    case 'INTERFACE': return 'Interface';
    case 'ACTIVITY_CONTROL_INITIAL_NODE': return 'InitialNode';
    case 'ACTIVITY_CONTROL_FINAL_NODE': return 'FinalNode';
    case 'ACTIVITY_ACTION_NODE': return 'ActionNode';
    case 'ACTIVITY_OBJECT': return 'ObjectNode';
    case 'ACTIVITY_MERGE_NODE': return 'MergeNode';
    case 'ACTIVITY_FORK_NODE': return 'ForkNode';
    default: return '';
  }
}
