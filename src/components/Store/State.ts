import Element, {
  ElementState,
  ElementKind,
  ElementRepository,
} from './../../domain/Element';
import Diagram, { DiagramState, DiagramType } from './../../domain/Diagram';
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
  Location,
} from '../../ApollonEditor';
import Relationship, {
  RelationshipKind,
  RelationshipRepository,
} from '../../domain/Relationship';
import Port from '../../domain/Port';
import Container from '../../domain/Container';
import * as Plugin from './../../domain/plugins';

interface State {
  editor: EditorState;
  diagram: DiagramState;
  elements: ElementState;
}

class State {
  static fromModel(model: UMLModel): State {
    const elements: Element[] = model.elements.reduce<Element[]>(
      (r, umlElement) => [
        ...r,
        ...(<any>Plugin)[umlElement.type].fromUMLElement(
          umlElement,
          (<any>Plugin)[umlElement.type]
        ),
      ],
      []
    );
    const relationships: Relationship[] = model.relationships.map<Relationship>(
      umlRelationship =>
        (<any>Plugin)[umlRelationship.type].fromUMLRelationship(
          umlRelationship,
          elements
        )
    );

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

    return { type: state.diagram.type, elements: e, relationships: r };
  }
}

export default State;
