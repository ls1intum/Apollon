import { Apollon } from '@ls1intum/apollon';
import { DeepPartial } from 'redux';
import { UMLRelationshipType } from 'src/packages/uml-relationship-type';
import { UMLElementType } from '../../packages/uml-element-type';
import { UMLElements } from '../../packages/uml-elements';
import { UMLRelationships } from '../../packages/uml-relationships';
import { AssessmentState } from '../../services/assessment/assessment-types';
import { EditorState } from '../../services/editor/editor-types';
import { UMLContainerRepository } from '../../services/uml-container/uml-container-repository';
import { UMLDiagramState } from '../../services/uml-diagram/uml-diagram-types';
import { ConnectableState } from '../../services/uml-element/connectable/connectable-types';
import { HoverableState } from '../../services/uml-element/hoverable/hoverable-types';
import { InteractableState } from '../../services/uml-element/interactable/interactable-types';
import { MovableState } from '../../services/uml-element/movable/movable-types';
import { ResizableState } from '../../services/uml-element/resizable/resizable-types';
import { SelectableState } from '../../services/uml-element/selectable/selectable-types';
import { UMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { UMLElementState } from '../../services/uml-element/uml-element-types';
import { UpdatableState } from '../../services/uml-element/updatable/updatable-types';
import { ReconnectableState } from '../../services/uml-relationship/reconnectable/reconnectable-types';
import { IUMLRelationship, UMLRelationship } from '../../services/uml-relationship/uml-relationship';
import { UMLRelationshipRepository } from '../../services/uml-relationship/uml-relationship-repository';
import { computeBoundingBoxForElements } from '../../utils/geometry/boundary';

export interface ModelState {
  editor: EditorState;
  diagram: UMLDiagramState;
  hovered: HoverableState;
  selected: SelectableState;
  moving: MovableState;
  resizing: ResizableState;
  connecting: ConnectableState;
  reconnecting: ReconnectableState;
  interactive: InteractableState;
  updating: UpdatableState;
  elements: UMLElementState;
  assessments: AssessmentState;
}

export class ModelState {
  static fromModel(model: Apollon.UMLModel): DeepPartial<ModelState> {
    const apollonElements = model.elements;
    const apollonRelationships = model.relationships;

    const deserialize = (apollonElement: Apollon.UMLElement): UMLElement[] => {
      const element = new UMLElements[apollonElement.type]();
      const children: Apollon.UMLElement[] = UMLContainerRepository.isUMLContainer(element)
        ? apollonElements
            .filter(child => child.owner === apollonElement.id)
            .map<Apollon.UMLElement>(val => {
              const parent = apollonElements.find(e => e.id === val.owner)!;
              return {
                ...val,
                bounds: { ...val.bounds, x: val.bounds.x - parent.bounds.x, y: val.bounds.y - parent.bounds.y },
              };
            })
        : [];

      element.deserialize(apollonElement, children);

      return [element, ...children.reduce<UMLElement[]>((acc, val) => [...acc, ...deserialize(val)], [])];
    };

    const elements = apollonElements
      .filter(element => !element.owner)
      .reduce<UMLElement[]>((acc, val) => [...acc, ...deserialize(val)], []);

    const relationships = apollonRelationships.map<UMLRelationship>(apollonRelationship => {
      const relationship = new UMLRelationships[apollonRelationship.type]();
      relationship.deserialize(apollonRelationship);
      return relationship;
    });

    const roots = [...elements.filter(element => !element.owner), ...relationships];
    const bounds = computeBoundingBoxForElements(roots);
    bounds.width = Math.ceil(bounds.width / 20) * 20;
    bounds.height = Math.ceil(bounds.height / 20) * 20;
    for (const element of roots) {
      element.bounds.x -= bounds.x + bounds.width / 2;
      element.bounds.y -= bounds.y + bounds.height / 2;
    }

    // return {
    //   diagram: {
    //     ownedElements: model.elements.filter(e => !e.owner).map(element => element.id),
    //     ownedRelationships: model.relationships.map(element => element.id),
    //   },
    //   // diagram: {
    //   //   ...(() => {
    //   //     const d = new UMLDiagram();
    //   //     Object.assign(d, {
    //   //       type: model.type,
    //   //       bounds: computedBounds,
    //   //     });
    //   //     return d;
    //   //   })(),
    //   //   ownedElements: root.filter(element => !(element instanceof UMLRelationship)).map(element => element.id),
    //   //   ownedRelationships: root.filter(element => element instanceof UMLRelationship).map(element => element.id),
    //   // },
    //   interactive: [...model.interactive.elements, ...model.interactive.relationships],
    //   elements: elements.reduce((acc, val) => ({ ...acc, [val.id]: val }), {}),
    //   assessments: model.assessments.reduce<AssessmentState>((r, o) => ({ ...r, [o.modelElementId]: o }), {}),
    // };

    return {
      elements: [...elements, ...relationships].reduce((acc, val) => ({ ...acc, [val.id]: { ...val } }), {}),
      assessments: (model.assessments || []).reduce<AssessmentState>(
        (acc, val) => ({ ...acc, [val.modelElementId]: { score: val.score, feedback: val.feedback } }),
        {},
      ),
    };
  }

  static toModel(state: ModelState): Apollon.UMLModel {
    const elements = Object.values(state.elements)
      .map<UMLElement | null>(element => UMLElementRepository.get(element))
      .reduce<{ [id: string]: UMLElement }>((acc, val) => ({ ...acc, ...(val && { [val.id]: val }) }), {});
    const relationships: UMLRelationship[] = Object.values(state.elements)
      .filter((x): x is IUMLRelationship => UMLRelationshipRepository.isUMLRelationship(x))
      .map(relationship => UMLRelationshipRepository.get(relationship)!);

    const serialize = (element: UMLElement): Apollon.UMLElement[] => {
      const children: UMLElement[] = UMLContainerRepository.isUMLContainer(element)
        ? element.ownedElements.map(id => elements[id])
        : [];

      return [
        element.serialize(children) as Apollon.UMLElement,
        ...children
          .reduce<Apollon.UMLElement[]>((acc, val) => [...acc, ...serialize(val)], [])
          .map<Apollon.UMLElement>(val => ({
            ...val,
            bounds: { ...val.bounds, x: val.bounds.x + element.bounds.x, y: val.bounds.y + element.bounds.y },
          })),
      ];
    };

    const apollonElements = Object.values(elements)
      .filter(element => !element.owner)
      .reduce<Apollon.UMLElement[]>((acc, val) => [...acc, ...serialize(val)], []);

    const apollonRelationships: Apollon.UMLRelationship[] = relationships.map(relationship => relationship.serialize());

    const roots = [...apollonElements, ...apollonRelationships].filter(element => !element.owner);
    const bounds = computeBoundingBoxForElements(roots);
    bounds.width = Math.ceil(bounds.width / 20) * 20;
    bounds.height = Math.ceil(bounds.height / 20) * 20;
    for (const element of apollonElements) {
      element.bounds.x -= bounds.x;
      element.bounds.y -= bounds.y;
    }
    for (const element of apollonRelationships) {
      element.bounds.x -= bounds.x;
      element.bounds.y -= bounds.y;
    }

    // const interactive: Selection = {
    //   elements: elements.filter(element => state.interactive.includes(element.id)).map<string>(element => element.id),
    //   relationships: relationships
    //     .filter(element => state.interactive.includes(element.id))
    //     .map<string>(element => element.id),
    // };

    // const size = {
    //   width: bounds.width,
    //   height: bounds.height,
    // };
    const size = {
      width: state.diagram.bounds.width,
      height: state.diagram.bounds.height,
    };

    const assessments = Object.keys(state.assessments).map<Apollon.Assessment>(id => ({
      modelElementId: id,
      elementType: state.elements[id].type as UMLElementType | UMLRelationshipType,
      score: state.assessments[id].score,
      feedback: state.assessments[id].feedback,
    }));

    return {
      elements: apollonElements,
      relationships: apollonRelationships,
      assessments,
    };

    // return {
    //   version: '2.0.0',
    //   size,
    //   type: state.diagram.type,
    //   interactive,
    //   elements,
    //   relationships,
    //   assessments,
    // };
  }
}
