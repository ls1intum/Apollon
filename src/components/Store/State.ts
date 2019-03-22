import Element, {
  ElementState,
  ElementRepository,
} from './../../domain/Element';
import Diagram, { DiagramState } from './../../domain/Diagram';
import {
  EditorState,
  ApollonMode,
  EditorMode,
  InteractiveElementsMode,
} from './../../services/EditorService';
import {
  UMLModel,
  UMLElement,
  UMLRelationship,
  Selection,
  Assessment,
} from '../../ApollonEditor';
import Relationship, {
  RelationshipRepository,
} from '../../domain/Relationship';
import Container from '../../domain/Container';
import * as Plugin from './../../domain/plugins';

interface State {
  editor: EditorState;
  diagram: DiagramState;
  elements: ElementState;
  assessments: { [id: string]: Assessment };
}

class State {
  static fromModel(model: UMLModel): State {
    const elements: Element[] = Object.values(model.elements)
      .reduce<Element[]>(
        (r, umlElement) => [
          ...r,
          ...(<any>Plugin)[umlElement.type].fromUMLElement(
            umlElement,
            (<any>Plugin)[umlElement.type]
          ),
        ],
        []
      )
      .map(element => {
        if (model.interactive.elements.includes(element.id)) {
          element.interactive = true;
        }
        return element;
      });
    const relationships: Relationship[] = Object.values(model.relationships)
      .map<Relationship>(umlRelationship =>
        (<any>Plugin)[umlRelationship.type].fromUMLRelationship(
          umlRelationship,
          elements
        )
      )
      .map(relationship => {
        if (model.interactive.relationships.includes(relationship.id)) {
          relationship.interactive = true;
        }
        return relationship;
      });

    return {
      editor: {
        gridSize: 0,
        mode: ApollonMode.Full,
        editorMode: EditorMode.ModelingView,
        interactiveMode: InteractiveElementsMode.Highlighted,
      },
      diagram: {
        ...new Diagram(model.type),
        ownedElements: Object.values(elements)
          .filter(e => !e.owner)
          .map(e => e.id),
        ownedRelationships: relationships.map(e => e.id),
      },
      elements: [...elements, ...relationships].reduce<ElementState>(
        (r, o) => ({ ...r, [o.id]: o }),
        {}
      ),
      assessments: model.assessments,
    };
  }

  static toModel(state: State): UMLModel {
    const elements = ElementRepository.read(state);

    const parseElement = (element: Element): UMLElement[] => {
      const c: Element[] =
        element instanceof Container
          ? element.ownedElements.map(
              id => elements.find(element => element.id === id)!
            )
          : [];
      const {
        element: result,
        children,
      } = (element.constructor as typeof Element).toUMLElement(element, c);
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

    return {
      type: state.diagram.type,
      interactive,
      elements: e.reduce<{ [id: string]: UMLElement }>(
        (o, e) => ({ ...o, [e.id]: e }),
        {}
      ),
      relationships: r.reduce<{ [id: string]: UMLRelationship }>(
        (o, e) => ({ ...o, [e.id]: e }),
        {}
      ),
      assessments: state.assessments,
    };
  }
}

export default State;
