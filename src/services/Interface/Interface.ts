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
import {
  Attribute,
  Method,
  Class,
  Enumeration,
  Interface,
  InitialNode,
  FinalNode,
  ActionNode,
  ObjectNode,
  MergeNode,
  ForkNode,
} from './../../domain/plugins';
import { LayoutedEntity } from '../../rendering/layouters/entity';

export const mapInternalToExternalState = (
  state: ReduxState
): ExternalState => ({
  version: '1.0',

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
      .map<Entity>(id => elementToEntity(state.elements[id], state.elements))
      .map<Entity>(e => {
        e.position = {
          x: e.position.x + state.diagram.bounds.width / 2,
          y: e.position.y + state.diagram.bounds.height / 2,
        };
        return e;
      })
      .reduce<{ [id: string]: Entity }>((o, e) => ({ ...o, [e.id]: e }), {}),
  },

  relationships: {
    allIds: state.relationships.allIds,
    byId: Object.keys(state.relationships.byId)
      .map<ExternalRelationship>(id => state.relationships.byId[id])
      .reduce<{ [id: string]: ExternalRelationship }>((o, r) => ({ ...o, [r.id]: r }), {}),
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
        .reduce<Element[]>((xs, id) => [...xs, ...entityToElements(state.entities.byId[id])], [])
        .map<Element>(e => {
          e.interactive = state.interactiveElements.allIds.includes(e.id);
          if (e.owner === null) {
            e.bounds = {
              ...e.bounds,
              x: e.bounds.x - state.editor.canvasSize.width / 2,
              y: e.bounds.y - state.editor.canvasSize.height / 2,
            };
          }
          return e;
        })
        .reduce<{ [id: string]: Element }>((o, e) => ({ ...o, [e.id]: e }), {})
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
        width: Math.max(state.editor.canvasSize.width, 1600),
        height: Math.max(state.editor.canvasSize.height, 1600),
      },
    }),
  },
});

export const elementToEntity = (element: Element, elements: { [id: string]: Element }): Entity => {
  let kind: string = '';

  if (element instanceof Class) {
    kind = element.isAbstract ? 'ABSTRACT_CLASS' : 'CLASS';
  } else if (element instanceof Enumeration) {
    kind = 'ENUMERATION';
  } else if (element instanceof Interface) {
    kind = 'INTERFACE';
  } else if (element instanceof InitialNode) {
    kind = 'ACTIVITY_CONTROL_INITIAL_NODE';
  } else if (element instanceof FinalNode) {
    kind = 'ACTIVITY_CONTROL_FINAL_NODE';
  } else if (element instanceof ActionNode) {
    kind = 'ACTIVITY_ACTION_NODE';
  } else if (element instanceof ObjectNode) {
    kind = 'ACTIVITY_OBJECT';
  } else if (element instanceof MergeNode) {
    kind = 'ACTIVITY_MERGE_NODE';
  } else if (element instanceof ForkNode) {
    kind = 'ACTIVITY_FORK_NODE';
  }

  const entity: Entity = {
    id: element.id,
    kind: kind as EntityKind,
    name: element.name,
    position: { x: element.bounds.x, y: element.bounds.y },
    size: { width: element.bounds.width, height: element.bounds.height },
    attributes: [],
    methods: [],
    renderMode: {
      showAttributes: true,
      showMethods: true,
    },
  };
  if (element instanceof Container) {
    entity.attributes = element.ownedElements
      .filter(id => elements[id] instanceof Attribute)
      .map<EntityMember>(id => ({ id, name: elements[id].name }));
    entity.methods = element.ownedElements
      .filter(id => elements[id] instanceof Method)
      .map<EntityMember>(id => ({ id, name: elements[id].name }));
  }
  return entity;
};

export const entityToElements = (entity: Entity): Element[] => {
  let init: Element;
  switch (entity.kind) {
    case 'CLASS':
      init = new Class(entity.name, false);
      break;
    case 'ABSTRACT_CLASS':
      init = new Class(entity.name, true);
      break;
    case 'ENUMERATION':
      init = new Enumeration(entity.name);
      break;
    case 'INTERFACE':
      init = new Interface(entity.name);
      break;
    case 'ACTIVITY_CONTROL_INITIAL_NODE':
      init = new InitialNode(entity.name);
      break;
    case 'ACTIVITY_CONTROL_FINAL_NODE':
      init = new FinalNode(entity.name);
      break;
    case 'ACTIVITY_ACTION_NODE':
      init = new ActionNode(entity.name);
      break;
    case 'ACTIVITY_OBJECT':
      init = new ObjectNode(entity.name);
      break;
    case 'ACTIVITY_MERGE_NODE':
      init = new MergeNode(entity.name);
      break;
    case 'ACTIVITY_FORK_NODE':
      init = new ForkNode(entity.name);
      break;
    default:
      return [];
  }
  let element: Element = {
    ...init,
    id: entity.id,
    bounds: { ...entity.position, ...entity.size },
    selected: false,
  };

  element = Object.setPrototypeOf(element, init.constructor.prototype);
  let current: Element[] = [];
  if (element instanceof Container) {
    for (const member of entity.attributes) {
      const attribute = Object.setPrototypeOf(
        { ...new Attribute(member.name), id: member.id },
        Attribute.prototype
      );
      let [parent, ...children] = (element as Container).addElement(
        attribute,
        current
      );
      element = parent;
      current = children;
    }
    for (const member of entity.methods) {
      const method = Object.setPrototypeOf(
        { ...new Method(member.name), id: member.id },
        Method.prototype
      );
      let [parent, ...children] = (element as Container).addElement(
        method,
        current
      );
      element = parent;
      current = children;
    }
  }
  return [element, ...current];
};

export const layoutedEntityToElements = (layoutedEntity: LayoutedEntity): Element[] => {
  const entity: Entity = layoutedEntity as Entity;
  let [element, ...children] = entityToElements(entity);
  if (element instanceof Container) element.ownedElements = [];
  children = children.map(c => ({
    ...c,
    bounds: {
      ...c.bounds,
      x: c.bounds.x + element.bounds.x,
      y: c.bounds.y + element.bounds.y,
    },
  }));
  return [element, ...children];
}
