import { AssessmentState } from '../../services/assessment/assessment-types';
import { Container } from '../../services/container/container';
import { Diagram } from '../../services/diagram/diagram';
import { DiagramState } from '../../services/diagram/diagram-types';
import { ApollonView, EditorState } from '../../services/editor/editor-types';
import { Element } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';
import { ElementState } from '../../services/element/element-types';
import { Relationship } from '../../services/relationship/relationship';
import { RelationshipRepository } from '../../services/relationship/relationship-repository';
import { ApollonMode, Assessment, Selection, UMLElement, UMLModel, UMLRelationship } from '../../typings';
import { computeBoundingBoxForElements } from '../../utils/geometry/boundary';

export interface ModelState {
  editor: EditorState;
  diagram: DiagramState;
  elements: ElementState;
  assessments: AssessmentState;
}

export class ModelState {
  static fromModel(model: UMLModel): ModelState {
    const state = [...model.elements, ...model.relationships].reduce<ElementState>(
      (result, element) => ({
        ...result,
        [element.id]: {
          owner: null,
          ...element,
          highlight: element.highlight,
          hovered: false,
          selected: false,
          interactive: [...model.interactive.elements, ...model.interactive.relationships].includes(element.id),
        },
      }),
      {},
    );

    const elements = [
      ...ElementRepository.getByIds(state)(Object.keys(state)),
      ...RelationshipRepository.getByIds(state)(Object.keys(state)),
    ].reduce<{ [id: string]: Element }>((result, element) => ({ ...result, [element.id]: element }), {});

    const root = Object.values(elements).filter(element => !element.owner);

    const position = (element: Element) => {
      if (element instanceof Container) {
        const children = Object.values(elements).filter(child => child.owner === element.id);
        element.ownedElements = children.map(child => child.id);
        for (const child of children) {
          position(child);
          child.bounds.x -= element.bounds.x;
          child.bounds.y -= element.bounds.y;
        }
        element.render(children);
      }
    };
    root.forEach(position);

    const bounds = computeBoundingBoxForElements(root);
    bounds.width = Math.ceil(bounds.width / 20) * 20;
    bounds.height = Math.ceil(bounds.height / 20) * 20;
    for (const element of root) {
      elements[element.id].bounds.x -= bounds.x + bounds.width / 2;
      elements[element.id].bounds.y -= bounds.y + bounds.height / 2;
    }

    let width = 0;
    let height = 0;
    for (const element of root) {
      width = Math.max(Math.abs(element.bounds.x), Math.abs(element.bounds.x + element.bounds.width), width);
      height = Math.max(Math.abs(element.bounds.y), Math.abs(element.bounds.y + element.bounds.height), height);
    }

    const computedBounds = { x: -width, y: -height, width: width * 2, height: height * 2 };

    return {
      editor: {
        readonly: false,
        enablePopups: true,
        mode: ApollonMode.Exporting,
        view: ApollonView.Modelling,
      },
      diagram: {
        ...(() => {
          const d = new Diagram();
          Object.assign(d, {
            type2: model.type,
            bounds: computedBounds,
          });
          return d;
        })(),
        ownedElements: root.filter(element => !(element instanceof Relationship)).map(element => element.id),
        ownedRelationships: root.filter(element => element instanceof Relationship).map(element => element.id),
      },
      elements,
      assessments: model.assessments.reduce<AssessmentState>((r, o) => ({ ...r, [o.modelElementId]: o }), {}),
    };
  }

  static toModel(state: ModelState): UMLModel {
    const elements = ElementRepository.read(state.elements);
    const relationships = RelationshipRepository.read(state.elements);
    const root = elements.filter(element => !element.owner);

    const parseElement = (element: Element): UMLElement[] => {
      const cont: Element[] = element instanceof Container ? element.ownedElements.map(id => elements.find(ee => ee.id === id)!) : [];
      const { element: result, children } = element.toUMLElement(element, cont);
      return [result, ...children.reduce<UMLElement[]>((r2, e3) => [...r2, ...parseElement(e3)], [])];
    };

    const e = root.reduce<UMLElement[]>((r2, e2) => [...r2, ...parseElement(e2)], []);

    const r = relationships.map<UMLRelationship>(relationship =>
      (relationship.constructor as typeof Relationship).toUMLRelationship(relationship),
    );

    const interactive: Selection = {
      elements: elements.filter(element => element.interactive).map<string>(element => element.id),
      relationships: relationships.filter(element => element.interactive).map<string>(element => element.id),
    };

    const bounds = computeBoundingBoxForElements(root);
    for (const element of e) {
      if (element.owner) {
        const absolutePosition = ElementRepository.getAbsolutePosition(state.elements)(element.id);
        element.bounds.x = absolutePosition.x;
        element.bounds.y = absolutePosition.y;
      }
      element.bounds.x -= bounds.x;
      element.bounds.y -= bounds.y;
    }
    for (const relationship of r) {
      relationship.bounds.x -= bounds.x;
      relationship.bounds.y -= bounds.y;
    }

    const size = {
      width: bounds.width,
      height: bounds.height,
    };

    const assessments = Object.keys(state.assessments).map<Assessment>(id => ({
      modelElementId: id,
      elementType: state.elements[id].type,
      score: state.assessments[id].score,
      feedback: state.assessments[id].feedback,
    }));

    return {
      version: '2.0',
      size,
      type: state.diagram.type2,
      interactive,
      elements: e,
      relationships: r,
      assessments,
    };
  }
}
