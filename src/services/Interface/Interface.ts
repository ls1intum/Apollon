import { State as ReduxState } from './../../components/Store';
import {
  ExternalState,
  Entity,
  EntityKind,
  EntityMember,
  Relationship as ExternalRelationship,
  RelationshipKind as ExternalRelationshipKind,
} from './ExternalState';
import {
  EditorMode,
  InteractiveElementsMode,
  ApollonMode,
} from '../EditorService';
import Diagram, { DiagramType } from '../../domain/Diagram';
import Element, { ElementKind, ElementRepository } from '../../domain/Element';
import Container from '../../domain/Container';
import Relationship, {
  RelationshipKind,
  RelationshipRepository,
} from '../../domain/Relationship';
import {
  Class,
  ClassAttribute,
  ClassMethod,
  UseCase,
  UseCaseActor,
  UseCaseSystem,
  AbstractClass,
  Interface,
  Enumeration,
  ClassBidirectional,
  ClassAggregation,
  ClassComposition,
  ClassUnidirectional,
  ClassDependency,
  ClassInheritance,
  ClassRealization,
  UseCaseAssociation,
  UseCaseGeneralization,
  UseCaseInclude,
  ActivityActionNode,
  ActivityFinalNode,
  ActivityForkNode,
  ActivityInitialNode,
  ActivityMergeNode,
  ActivityObjectNode,
  ActivityControlFlow,
} from '../../domain/plugins';
import Port, { Connection } from '../../domain/Port';
import ClassMember from '../../domain/plugins/ClassDiagram/ClassMember/ClassMember';
import ClassAssociation from '../../domain/plugins/ClassDiagram/ClassAssociation/ClassAssociation';
import Boundary from '../../domain/geo/Boundary';
import Point from '../../domain/geometry/Point';

export const mapInternalToExternalState = (
  state: ReduxState
): ExternalState => {
  const elements: Element[] = ElementRepository.read(state);
  const relationships: Relationship[] = RelationshipRepository.read(
    state.elements
  );

  const external = {
    version: '1.0',

    entities: {
      allIds: elements.filter(e => !(e instanceof ClassMember)).map(e => e.id),
      byId: elements
        .filter(e => !(e instanceof ClassMember))
        .map<Entity>(element => elementToExternal(element, state.elements))
        .map<Entity>(e => {
          if (e.owner === null) {
            e.position = {
              x: e.position.x + state.diagram.bounds.width / 2,
              y: e.position.y + state.diagram.bounds.height / 2,
            };
          }
          return e;
        })
        .reduce<{ [id: string]: Entity }>((o, e) => ({ ...o, [e.id]: e }), {}),
    },

    relationships: {
      allIds: relationships.map(e => e.id),
      byId: relationships
        .map<ExternalRelationship>(r => relationshipToExternal(r))
        .reduce<{ [id: string]: ExternalRelationship }>(
          (o, r) => ({ ...o, [r.id]: r }),
          {}
        ),
    },

    interactiveElements: {
      allIds: [
        ...elements.filter(e => e.interactive).map(e => e.id),
        ...relationships.filter(r => r.interactive).map(r => r.id),
      ],
    },

    editor: {
      canvasSize: {
        width: state.diagram.bounds.width,
        height: state.diagram.bounds.height,
      },
      gridSize: state.editor.gridSize,
    },
  };

  return external;
};

export const mapExternalToInternalState = (
  state: ExternalState | undefined,
  type: DiagramType = DiagramType.ClassDiagram,
  editorMode: EditorMode = EditorMode.ModelingView,
  interactiveMode: InteractiveElementsMode = InteractiveElementsMode.Highlighted,
  mode: ApollonMode = ApollonMode.ReadOnly
): ReduxState => {
  const elements = state
    ? state.entities.allIds
        .reduce<Element[]>(
          (xs, id) => [...xs, ...entityToElements(state.entities.byId[id])],
          []
        )
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
    : {};

  const relationships = state
    ? Object.keys(state.relationships.byId)
        .map<Relationship>(id =>
          externalToRelationship(
            state.relationships.byId[id],
            Object.values(elements)
          )
        )
        .map<Relationship>(relationship => {
          relationship.interactive = state.interactiveElements.allIds.includes(
            relationship.id
          );
          return relationship;
        })
        .reduce(
          (o: { [id: string]: Relationship }, r: Relationship) => ({
            ...o,
            [r.id]: r,
          }),
          {}
        )
    : {};

  const internal = {
    editor: {
      gridSize: state ? state.editor.gridSize : 10,
      editorMode,
      interactiveMode,
      mode,
    },

    diagram: {
      ...new Diagram(type),
      ...(state && {
        ownedElements: Object.values(elements)
          .filter(e => !e.owner)
          .map(e => e.id),
        ownedRelationships: state.relationships.allIds,
        bounds: {
          x: 0,
          y: 0,
          width: Math.max(state.editor.canvasSize.width, 1600),
          height: Math.max(state.editor.canvasSize.height, 1600),
        },
      }),
    },
    elements: { ...elements, ...relationships },
  };

  return internal;
};

export const elementToExternal = (
  element: Element,
  elements: { [id: string]: Element }
): Entity => {
  const kind = ((element: Element) => {
    switch (element.kind) {
      case ElementKind.Class:
        return EntityKind.Class;
      case ElementKind.AbstractClass:
        return EntityKind.AbstractClass;
      case ElementKind.Interface:
        return EntityKind.Interface;
      case ElementKind.Enumeration:
        return EntityKind.Enumeration;
      case ElementKind.ActivityActionNode:
        return EntityKind.ActivityActionNode;
      case ElementKind.ActivityFinalNode:
        return EntityKind.ActivityFinalNode;
      case ElementKind.ActivityForkNode:
        return EntityKind.ActivityForkNode;
      case ElementKind.ActivityInitialNode:
        return EntityKind.ActivityInitialNode;
      case ElementKind.ActivityMergeNode:
        return EntityKind.ActivityMergeNode;
      case ElementKind.ActivityObjectNode:
        return EntityKind.ActivityObjectNode;
      case ElementKind.UseCase:
        return EntityKind.UseCase;
      case ElementKind.UseCaseActor:
        return EntityKind.UseCaseActor;
      case ElementKind.UseCaseSystem:
        return EntityKind.UseCaseSystem;
    }
  })(element);

  if (!kind) {
    throw new Error(`Don't know how to export ${element.kind}`);
  }

  const entity: Entity = {
    id: element.id,
    kind: kind as EntityKind,
    name: element.name,
    position: { x: element.bounds.x, y: element.bounds.y },
    size: { width: element.bounds.width, height: element.bounds.height },
    attributes: [],
    methods: [],
    owner: element.owner,
    ownedElements: [],
    renderMode: {
      showAttributes: true,
      showMethods: true,
    },
  };
  if (element instanceof Container) {
    entity.attributes = element.ownedElements
      .filter(id => elements[id] instanceof ClassAttribute)
      .map<EntityMember>(id => ({ id, name: elements[id].name }));
    entity.methods = element.ownedElements
      .filter(id => elements[id] instanceof ClassMethod)
      .map<EntityMember>(id => ({ id, name: elements[id].name }));
    entity.ownedElements = element.ownedElements.filter(
      id => !(elements[id] instanceof ClassMember)
    );
  }
  return entity;
};

export const entityToElements = (entity: Entity): Element[] => {
  const init = ((entity: Entity) => {
    switch (entity.kind) {
      case EntityKind.Class:
        return new Class(entity.name);
      case EntityKind.AbstractClass:
        return new AbstractClass(entity.name);
      case EntityKind.Interface:
        return new Interface(entity.name);
      case EntityKind.Enumeration:
        return new Enumeration(entity.name);
      case EntityKind.ActivityActionNode:
        return new ActivityActionNode(entity.name);
      case EntityKind.ActivityFinalNode:
        return new ActivityFinalNode(entity.name);
      case EntityKind.ActivityForkNode:
        return new ActivityForkNode(entity.name);
      case EntityKind.ActivityInitialNode:
        return new ActivityInitialNode(entity.name);
      case EntityKind.ActivityMergeNode:
        return new ActivityMergeNode(entity.name);
      case EntityKind.ActivityObjectNode:
        return new ActivityObjectNode(entity.name);
      case EntityKind.UseCase:
        return new UseCase(entity.name);
      case EntityKind.UseCaseActor:
        return new UseCaseActor(entity.name);
      case EntityKind.UseCaseSystem:
        return new UseCaseSystem(entity.name);
    }
  })(entity);

  if (!init) {
    throw new Error(`Don't know how to import ${entity.kind}`);
  }

  let element: Element = {
    ...init,
    id: entity.id,
    bounds: { ...entity.position, ...entity.size },
    selected: false,
    owner: entity.owner,
  };

  element = Object.setPrototypeOf(element, init.constructor.prototype);
  let current: Element[] = [];
  if (element instanceof Container) {
    element.ownedElements = entity.ownedElements.filter(
      id =>
        !entity.attributes.map(a => a.id).includes(id) &&
        !entity.methods.map(a => a.id).includes(id)
    );
    [element, ...current] = element.render([]);
    for (const member of entity.attributes) {
      const attribute = Object.setPrototypeOf(
        { ...new ClassAttribute(member.name), id: member.id },
        ClassAttribute.prototype
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
        { ...new ClassMethod(member.name), id: member.id },
        ClassMethod.prototype
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

// export const layoutedEntityToElements = (
//   layoutedEntity: LayoutedEntity
// ): Element[] => {
//   const entity: Entity = layoutedEntity as Entity;
//   let [element, ...children] = entityToElements(entity);
//   if (element instanceof Container) element.ownedElements = [];
//   children = children.map(c => ({
//     ...c,
//     bounds: {
//       ...c.bounds,
//       x: c.bounds.x + element.bounds.x,
//       y: c.bounds.y + element.bounds.y,
//     },
//   }));
//   return [element, ...children];
// };

export const relationshipToExternal = (
  relationship: Relationship
): ExternalRelationship => {
  const kind = ((relationship: Relationship) => {
    switch (relationship.kind) {
      case RelationshipKind.ClassAggregation:
        return ExternalRelationshipKind.ClassAggregation;
      case RelationshipKind.ClassBidirectional:
        return ExternalRelationshipKind.ClassBidirectional;
      case RelationshipKind.ClassComposition:
        return ExternalRelationshipKind.ClassComposition;
      case RelationshipKind.ClassDependency:
        return ExternalRelationshipKind.ClassDependency;
      case RelationshipKind.ClassInheritance:
        return ExternalRelationshipKind.ClassInheritance;
      case RelationshipKind.ClassRealization:
        return ExternalRelationshipKind.ClassRealization;
      case RelationshipKind.ActivityControlFlow:
        return ExternalRelationshipKind.ActivityControlFlow;
      case RelationshipKind.ClassUnidirectional:
        return ExternalRelationshipKind.ClassUnidirectional;
      case RelationshipKind.UseCaseAssociation:
        return ExternalRelationshipKind.UseCaseAssociation;
      case RelationshipKind.UseCaseGeneralization:
        return ExternalRelationshipKind.UseCaseGeneralization;
      case RelationshipKind.UseCaseInclude:
        return ExternalRelationshipKind.UseCaseInclude;
    }
  })(relationship);

  if (!kind) {
    throw new Error(`Don't know how to export ${relationship.kind}`);
  }

  return {
    id: relationship.id,
    kind,
    source: {
      entityId: relationship.source.element,
      multiplicity:
        relationship instanceof ClassAssociation
          ? relationship.multiplicity.source
          : '',
      role:
        relationship instanceof ClassAssociation
          ? relationship.role.source
          : '',
      edge:
        relationship.source.location === 'N'
          ? 'TOP'
          : relationship.source.location === 'E'
          ? 'RIGHT'
          : relationship.source.location === 'S'
          ? 'BOTTOM'
          : 'LEFT',
      edgeOffset: 0.5,
    },
    target: {
      entityId: relationship.target.element,
      multiplicity:
        relationship instanceof ClassAssociation
          ? relationship.multiplicity.target
          : '',
      role:
        relationship instanceof ClassAssociation
          ? relationship.role.target
          : '',
      edge:
        relationship.target.location === 'N'
          ? 'TOP'
          : relationship.target.location === 'E'
          ? 'RIGHT'
          : relationship.target.location === 'S'
          ? 'BOTTOM'
          : 'LEFT',
      edgeOffset: 0.5,
    },
    straightLine: false,
  };
};

export const externalToRelationship = (
  external: ExternalRelationship,
  elements: Element[],
  path: Point[] | null = null
): Relationship => {
  const source: Port = {
    element: external.source.entityId,
    location:
      external.source.edge === 'TOP'
        ? 'N'
        : external.source.edge === 'RIGHT'
        ? 'E'
        : external.source.edge === 'BOTTOM'
        ? 'S'
        : 'W',
  };
  const target: Port = {
    element: external.target.entityId,
    location:
      external.target.edge === 'TOP'
        ? 'N'
        : external.target.edge === 'RIGHT'
        ? 'E'
        : external.target.edge === 'BOTTOM'
        ? 'S'
        : 'W',
  };

  let init: Relationship = new ClassBidirectional(
    'Association',
    source,
    target
  );
  switch (external.kind) {
    case ExternalRelationshipKind.ClassAggregation:
      init = new ClassAggregation('Association', source, target);
      break;
    case ExternalRelationshipKind.ClassBidirectional:
      init = new ClassBidirectional('Association', source, target);
      break;
    case ExternalRelationshipKind.ClassUnidirectional:
      init = new ClassUnidirectional('Association', source, target);
      break;
    case ExternalRelationshipKind.ClassComposition:
      init = new ClassComposition('Association', source, target);
      break;
    case ExternalRelationshipKind.ClassDependency:
      init = new ClassDependency('Association', source, target);
      break;
    case ExternalRelationshipKind.ClassInheritance:
      init = new ClassInheritance('Association', source, target);
      break;
    case ExternalRelationshipKind.ClassRealization:
      init = new ClassRealization('Association', source, target);
      break;
    case ExternalRelationshipKind.ActivityControlFlow:
      init = new ActivityControlFlow('Association', source, target);
      break;
    case ExternalRelationshipKind.UseCaseAssociation:
      init = new UseCaseAssociation('Association', source, target);
      break;
    case ExternalRelationshipKind.UseCaseGeneralization:
      init = new UseCaseGeneralization('Association', source, target);
      break;
    case ExternalRelationshipKind.UseCaseInclude:
      init = new UseCaseInclude('Association', source, target);
      break;
  }

  if (!path) {
    let current: Element = elements.find(e => e.id === source.element)!;
    let sourceRect: Boundary = { ...current.bounds };
    while (current.owner) {
      current = elements.find(e => e.id === current.owner)!;
      sourceRect = {
        ...sourceRect,
        x: sourceRect.x + current.bounds.x,
        y: sourceRect.y + current.bounds.y,
      };
    }

    current = elements.find(e => e.id === target.element)!;
    let targetRect: Boundary = { ...current.bounds };
    while (current.owner) {
      current = elements.find(e => e.id === current.owner)!;
      targetRect = {
        ...targetRect,
        x: targetRect.x + current.bounds.x,
        y: targetRect.y + current.bounds.y,
      };
    }

    const { straight } = (init.constructor as typeof Relationship).features;

    const points = Connection.computePath(
      { bounds: sourceRect, location: source.location },
      { bounds: targetRect, location: target.location },
      { isStraight: straight }
    );
    path = points.map(point => new Point(point.x, point.y));
  }

  const relationship: Relationship = {
    ...init,
    id: external.id,
    selected: false,
    interactive: false,
    path,
    sourceMultiplicity: external.source.multiplicity,
    sourceRole: external.source.role,
    targetMultiplicity: external.target.multiplicity,
    targetRole: external.target.role,
  } as Relationship;
  return relationship;
};
