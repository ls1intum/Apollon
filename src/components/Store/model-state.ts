import { Element, ElementState, ElementRepository, ElementType } from '../../domain/Element';
import { Diagram, DiagramState } from '../../domain/Diagram';
import { EditorState, ApollonView } from '../../services/editor';
import {
  UMLModel,
  UMLElement,
  UMLRelationship,
  Selection,
  ApollonMode,
} from '../..';
import Relationship, {
  RelationshipRepository,
} from '../../domain/Relationship';
import Container from '../../domain/Container';
import * as Plugin from '../../domain/plugins';
import { computeBoundingBox } from '../../domain/geo';
import { AssessmentState } from '../../services/assessment/assessment-types';
import { elements as elementClass } from './../../domain/plugins/elements'

export interface ModelState {
  editor: EditorState;
  diagram: DiagramState;
  elements: ElementState;
  assessments: AssessmentState;
}

export class ModelState {
  static fromModel(model: UMLModel): ModelState {
    let elements: { [id: string]: Element } = Object.values(model.elements)
      .map(umlElement => {
        const Clazz = elementClass[umlElement.type];
        const element = new Clazz(umlElement);
        if (model.interactive.elements.includes(element.id)) {
          element.interactive = true;
        }
        return element;
      })
      .reduce((r, o) => ({ ...r, [o.id]: o }), {});

    elements = Object.values(elements).reduce((state, element) => {
      if (element instanceof Container) {
        const children = Object.values(elements).filter(
          child => child.owner === element.id
        ).map<Element>(child => {
          const Clazz = elementClass[child.type as ElementType];
          const element = new Clazz(child);
          return element;
        });
        element.ownedElements = children.map(child => child.id);
        const changes = element
          .render(children)
          .reduce<ElementState>((r, o) => ({ ...r, [o.id]: o }), {});
        return { ...state, ...changes };
      }
      return { ...state, [element.id]: element };
    }, {});

    const relationships: ElementState = Object.values(model.relationships)
      .map<Relationship>(umlRelationship => {
        const Clazz: typeof Relationship = (<any>Plugin)[umlRelationship.type];
        const relationship = Clazz.fromUMLRelationship(
          umlRelationship,
          Object.values(elements),
          (<any>Plugin)[umlRelationship.type]
        );
        if (model.interactive.relationships.includes(relationship.id)) {
          relationship.interactive = true;
        }
        return relationship;
      })
      .reduce<ElementState>((r, o) => ({ ...r, [o.id]: o }), {});

    return {
      editor: {
        readonly: false,
        mode: ApollonMode.Exporting,
        view: ApollonView.Modelling,
      },
      diagram: {
        ...new Diagram(model.type),
        ownedElements: Object.values(elements)
          .filter(e => !e.owner)
          .map(e => e.id),
        ownedRelationships: Object.keys(relationships),
      },
      elements: { ...elements, ...relationships },
      assessments: model.assessments.reduce<AssessmentState>(
        (r, o) => ({ ...r, [o.modelElementId]: o }),
        {}
      ),
    };
  }

  static toModel(state: ModelState): UMLModel {
    const elements = ElementRepository.read(state);

    const parseElement = (element: Element): UMLElement[] => {
      const c: Element[] =
        element instanceof Container
          ? element.ownedElements.map(
              id => elements.find(element => element.id === id)!
            )
          : [];
      const { element: result, children } = element.toUMLElement(element, c);
      return [
        result,
        ...children.reduce<UMLElement[]>(
          (r, e) => [...r, ...parseElement(e)],
          []
        ),
      ];
    };

    const e = elements
      .filter(element => !element.owner)
      .reduce<UMLElement[]>((r, e) => [...r, ...parseElement(e)], []);

    const relationships = RelationshipRepository.read(state.elements);
    const r = relationships.map<UMLRelationship>(relationship =>
      (relationship.constructor as typeof Relationship).toUMLRelationship(
        relationship
      )
    );

    const interactive: Selection = {
      elements: elements
        .filter(element => element.interactive)
        .map<string>(element => element.id),
      relationships: relationships
        .filter(element => element.interactive)
        .map<string>(element => element.id),
    };

    const points = [...e.map(e => e.bounds), ...r.map(r => r.bounds)].reduce<
      {
        x: number;
        y: number;
      }[]
    >(
      (a, bounds) => [
        ...a,
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y },
        { x: bounds.x, y: bounds.y + bounds.height },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      ],
      []
    );
    const boundingBox = computeBoundingBox(points);
    const size = {
      width: boundingBox.width - boundingBox.x,
      height: boundingBox.height - boundingBox.y,
    };

    return {
      version: '2.0',
      size,
      type: state.diagram.type2,
      interactive,
      elements: e,
      relationships: r,
      assessments: Object.values(state.assessments),
    };
  }
}
