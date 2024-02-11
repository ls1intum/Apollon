import { UMLElementType } from '../../packages/uml-element-type';
import { UMLElements } from '../../packages/uml-elements';
import { UMLRelationshipType } from '../../packages/uml-relationship-type';
import { UMLRelationships } from '../../packages/uml-relationships';
import { AssessmentState } from '../../services/assessment/assessment-types';
import { EditorState } from '../../services/editor/editor-types';
import { UMLContainer } from '../../services/uml-container/uml-container';
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
import * as Apollon from '../../typings';
import { UMLDiagramType } from '../../typings';
import { backwardsCompatibleModel, UMLModelCompat } from '../../compat';
import { computeBoundingBoxForElements } from '../../utils/geometry/boundary';
import { UMLDiagram } from '../../services/uml-diagram/uml-diagram';
import { CopyState } from '../../services/copypaste/copy-types';
import { LastActionState } from '../../services/last-action/last-action-types';
import { arrayToInclusionMap, inclusionMapToArray } from './util';
import { RemoteSelectionState } from '../../services/uml-element/remote-selectable/remote-selectable-types';

export type PartialModelState = Omit<Partial<ModelState>, 'editor'> & { editor?: Partial<EditorState> };

export interface ModelState {
  editor: EditorState;
  diagram: UMLDiagramState;
  hovered: HoverableState;
  selected: SelectableState;
  remoteSelection: RemoteSelectionState;
  moving: MovableState;
  resizing: ResizableState;
  connecting: ConnectableState;
  reconnecting: ReconnectableState;
  interactive: InteractableState;
  updating: UpdatableState;
  elements: UMLElementState;
  assessments: AssessmentState;
  copy: CopyState;
  lastAction: LastActionState;
}

// TODO: simplify this code, break it into smaller pieces.
// FIXME: this code has issues in various cases, including when
//        the boundary of the diagram is determined by some relationship.

export class ModelState {
  static fromModel(compatModel: UMLModelCompat): PartialModelState {
    const model = backwardsCompatibleModel(compatModel);

    const apollonElements = model.elements;
    const apollonRelationships = model.relationships;

    const deserialize = (apollonElement: Apollon.UMLElement): UMLElement[] => {
      const element = new UMLElements[apollonElement.type]();
      const children: Apollon.UMLElement[] = UMLContainer.isUMLContainer(element)
        ? Object.values(apollonElements)
            .filter((child) => child.owner === apollonElement.id)
            .map((val) => {
              const parent = apollonElements[val.owner!];
              return {
                ...val,
                bounds: { ...val.bounds, x: val.bounds.x - parent.bounds.x, y: val.bounds.y - parent.bounds.y },
              } as Apollon.UMLElement;
            })
        : [];

      element.deserialize(apollonElement, children);

      return [element, ...children.reduce<UMLElement[]>((acc, val) => [...acc, ...deserialize(val)], [])];
    };

    const elements = Object.values(apollonElements)
      .filter((element) => !element.owner)
      .reduce<UMLElement[]>((acc, val) => [...acc, ...deserialize(val)], []);

    const relationships = Object.values(apollonRelationships).map<UMLRelationship>((apollonRelationship) => {
      const relationship = new UMLRelationships[apollonRelationship.type]();
      relationship.deserialize(apollonRelationship);
      return relationship;
    });

    // set diagram to keep diagram type
    const diagram: UMLDiagram = new UMLDiagram();
    diagram.type = model.type as UMLDiagramType;
    diagram.ownedRelationships = Object.values(model.relationships).map((s) => {
      return s.id;
    });

    return {
      diagram,
      interactive: [
        ...inclusionMapToArray(model.interactive.elements),
        ...inclusionMapToArray(model.interactive.relationships),
      ],
      elements: [...elements, ...relationships].reduce((acc, val) => ({ ...acc, [val.id]: { ...val } }), {}),
      assessments: (Object.values(model.assessments) || []).reduce<AssessmentState>(
        (acc, val) => ({
          ...acc,
          [val.modelElementId]: {
            score: val.score,
            feedback: val.feedback,
            label: val.label,
            labelColor: val.labelColor,
            correctionStatus: val.correctionStatus,
            dropInfo: val.dropInfo,
          },
        }),
        {},
      ),
    };
  }

  static toModel(state: ModelState): Apollon.UMLModel {
    const elements = Object.values(state.elements)
      .map<UMLElement | null>((element) => UMLElementRepository.get(element))
      .reduce<{ [id: string]: UMLElement }>((acc, val) => ({ ...acc, ...(val && { [val.id]: val }) }), {});

    const relationships: UMLRelationship[] = Object.values(state.elements)
      .filter((x): x is IUMLRelationship => UMLRelationship.isUMLRelationship(x))
      .map((relationship) => UMLRelationshipRepository.get(relationship)!);

    const serialize = (element: UMLElement): { [id: string]: Apollon.UMLElement } => {
      const children: UMLElement[] = UMLContainer.isUMLContainer(element)
        ? element.ownedElements.map((id) => elements[id])
        : [];

      const res = {
        [element.id]: element.serialize(children) as Apollon.UMLElement,
      };

      for (const child of children) {
        const childres = serialize(child);
        Object.values(childres).forEach((child) => {
          child.bounds.x += element.bounds.x;
          child.bounds.y += element.bounds.y;
        });

        Object.assign(res, childres);
      }

      return res;
    };

    const apollonElements = Object.values(elements)
      .filter((element) => !element.owner)
      .reduce((acc, element) => ({ ...acc, ...serialize(element) }), {}) as { [id: string]: Apollon.UMLElement };

    const apollonElementsArray = Object.values(apollonElements);

    const apollonRelationships: Apollon.UMLRelationship[] = relationships.map((relationship) =>
      relationship.serialize(),
    );

    const interactive: Apollon.Selection = {
      elements: arrayToInclusionMap(state.interactive.filter((id) => UMLElement.isUMLElement(state.elements[id]))),
      relationships: arrayToInclusionMap(
        state.interactive.filter((id) => UMLRelationship.isUMLRelationship(state.elements[id])),
      ),
    };

    const assessments = Object.fromEntries(
      Object.entries(state.assessments).map(([id, assessment]) => [
        id,
        {
          modelElementId: id,
          elementType: state.elements[id].type as UMLElementType | UMLRelationshipType,
          score: state.assessments[id].score,
          feedback: state.assessments[id].feedback,
          label: state.assessments[id].label,
          labelColor: state.assessments[id].labelColor,
          correctionStatus: state.assessments[id].correctionStatus,
          dropInfo: state.assessments[id].dropInfo,
        },
      ]),
    );

    return {
      version: '3.0.0',
      type: state.diagram.type,
      size: { width: state.diagram.bounds.width, height: state.diagram.bounds.height },
      interactive,
      elements: apollonElements,
      relationships: Object.fromEntries(apollonRelationships.map((relationship) => [relationship.id, relationship])),
      assessments,
    };
  }
}
