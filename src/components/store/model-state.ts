import { ElementType } from '../../packages/element-type';
import { Elements } from '../../packages/elements';
import { Relationships } from '../../packages/relationships';
import { AssessmentState } from '../../services/assessment/assessment-types';
import { Container } from '../../services/container/container';
import { Diagram } from '../../services/diagram/diagram';
import { DiagramState } from '../../services/diagram/diagram-types';
import { ApollonView } from '../../services/editor/editor-types';
import { EditorState } from '../../services/editor/editor-types';
import { Element } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';
import { ElementState } from '../../services/element/element-types';
import { Relationship } from '../../services/relationship/relationship';
import { RelationshipRepository } from '../../services/relationship/relationship-repository';
import { ApollonMode, Selection, UMLElement, UMLModel, UMLRelationship } from '../../typings';
import { computeBoundingBox } from '../../utils/geometry/boundary';
import { Point } from '../../utils/geometry/point';

export interface ModelState {
  editor: EditorState;
  diagram: DiagramState;
  elements: ElementState;
  assessments: AssessmentState;
}

export class ModelState {
  static fromModel(model: UMLModel): ModelState {
    const copy: UMLModel = JSON.parse(JSON.stringify(model));
    let elements: { [id: string]: Element } = Object.values(copy.elements)
      .map(umlElement => {
        const Clazz = Elements[umlElement.type];
        const element = new Clazz(umlElement);
        if (copy.interactive.elements.includes(element.id)) {
          element.interactive = true;
        }
        return element;
      })
      .reduce((r, o) => ({ ...r, [o.id]: o }), {});

    elements = Object.values(elements).reduce((state, element) => {
      if (element instanceof Container) {
        const children = Object.values(elements)
          .filter(child => child.owner === element.id)
          .map<Element>(child => {
            const Clazz = Elements[child.type as ElementType];
            return new Clazz(child);
          });
        element.ownedElements = children.map(child => child.id);
        const changes = element.render(children).reduce<ElementState>((r, o) => ({ ...r, [o.id]: o }), {});
        return { ...state, ...changes };
      }
      return { ...state, [element.id]: element };
    }, {});

    const relationships: { [id: string]: Relationship } = Object.values(copy.relationships)
      .map<Relationship>(umlRelationship => {
        const Clazz = Relationships[umlRelationship.type];
        const relationship: Relationship = new Clazz(umlRelationship);
        if (copy.interactive.relationships.includes(relationship.id)) {
          relationship.interactive = true;
        }
        return relationship;
      })
      .reduce((r, o) => ({ ...r, [o.id]: o }), {});

    return {
      editor: {
        readonly: false,
        mode: ApollonMode.Exporting,
        view: ApollonView.Modelling,
      },
      diagram: {
        ...(() => {
          const d = new Diagram();
          d.type2 = copy.type;
          return d;
        })(),
        ownedElements: Object.values(elements)
          .filter(e => !e.owner)
          .map(e => e.id),
        ownedRelationships: Object.keys(relationships),
      },
      elements: { ...elements, ...relationships },
      assessments: copy.assessments.reduce<AssessmentState>((r, o) => ({ ...r, [o.modelElementId]: o }), {}),
    };
  }

  static toModel(state: ModelState): UMLModel {
    const copy: ModelState = JSON.parse(JSON.stringify(state));
    const elements = ElementRepository.read(copy);

    const parseElement = (element: Element): UMLElement[] => {
      const cont: Element[] = element instanceof Container ? element.ownedElements.map(id => elements.find(ee => ee.id === id)!) : [];
      const { element: result, children } = element.toUMLElement(element, cont);
      return [result, ...children.reduce<UMLElement[]>((r2, e3) => [...r2, ...parseElement(e3)], [])];
    };

    const e = elements.filter(element => !element.owner).reduce<UMLElement[]>((r2, e2) => [...r2, ...parseElement(e2)], []);

    const relationships = RelationshipRepository.read(copy.elements);
    const r = relationships.map<UMLRelationship>(relationship =>
      (relationship.constructor as typeof Relationship).toUMLRelationship(relationship),
    );

    const interactive: Selection = {
      elements: elements.filter(element => element.interactive).map<string>(element => element.id),
      relationships: relationships.filter(element => element.interactive).map<string>(element => element.id),
    };

    const points: Point[] = [...e.map(e2 => e2.bounds), ...r.map(r2 => r2.bounds)].reduce<Point[]>(
      (a, bounds) => [
        ...a,
        new Point(bounds.x, bounds.y),
        new Point(bounds.x + bounds.width, bounds.y),
        new Point(bounds.x, bounds.y + bounds.height),
        new Point(bounds.x + bounds.width, bounds.y + bounds.height),
      ],
      [],
    );
    const boundingBox = computeBoundingBox(points);
    const size = {
      width: boundingBox.width - boundingBox.x,
      height: boundingBox.height - boundingBox.y,
    };

    return {
      version: '2.0',
      size,
      type: copy.diagram.type2,
      interactive,
      elements: e,
      relationships: r,
      assessments: Object.values(copy.assessments),
    };
  }
}
