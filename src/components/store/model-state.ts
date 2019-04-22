import { DeepPartial } from 'redux';
import { AssessmentState } from '../../services/assessment/assessment-types';
import { EditorState } from '../../services/editor/editor-types';
import { UMLDiagramState } from '../../services/uml-diagram/uml-diagram-types';
import { HoverableState } from '../../services/uml-element/hoverable/hoverable-types';
import { InteractableState } from '../../services/uml-element/interactable/interactable-types';
import { MovableState } from '../../services/uml-element/movable/movable-types';
import { ResizableState } from '../../services/uml-element/resizable/resizable-types';
import { SelectableState } from '../../services/uml-element/selectable/selectable-types';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { UMLElementState } from '../../services/uml-element/uml-element-types';
import { UpdatableState } from '../../services/uml-element/updatable/updatable-types';
import { IUMLRelationship } from '../../services/uml-relationship/uml-relationship';
import { UMLRelationshipRepository } from '../../services/uml-relationship/uml-relationship-repository';
import { Assessment, Selection, UMLElementType, UMLModel } from '../../typings';

export interface ModelState {
  editor: EditorState;
  diagram: UMLDiagramState;
  hovered: HoverableState;
  selected: SelectableState;
  moving: MovableState;
  resizing: ResizableState;
  interactive: InteractableState;
  updating: UpdatableState;
  elements: UMLElementState;
  assessments: AssessmentState;
}

export class ModelState {
  static fromModel(model: UMLModel): DeepPartial<ModelState> {
    // const state = [...model.elements, ...model.relationships].reduce<UMLElementState>(
    //   (result, element) => ({
    //     ...result,
    //     [element.id]: {
    //       owner: null,
    //       ...element,
    //     },
    //   }),
    //   {},
    // );

    // const elements = [
    //   ...UMLElementRepository.getByIds(state)(Object.keys(state)),
    //   ...UMLRelationshipRepository.getByIds(state)(Object.keys(state)),
    // ].reduce<{ [id: string]: UMLElement }>((result, element) => ({ ...result, [element.id]: element }), {});

    // const root = Object.values(elements).filter(element => !element.owner);

    // const position = (element: UMLElement) => {
    //   if (element instanceof UMLContainer) {
    //     const children = Object.values(elements).filter(child => child.owner === element.id);
    //     element.ownedElements = children.map(child => child.id);
    //     for (const child of children) {
    //       position(child);

    //       if (model.version === '2.0.0') {
    //         child.bounds.x -= element.bounds.x;
    //         child.bounds.y -= element.bounds.y;
    //       }
    //     }
    //     element.render(children);
    //   }
    // };
    // root.forEach(position);

    // const bounds = computeBoundingBoxForElements(root);
    // bounds.width = Math.ceil(bounds.width / 20) * 20;
    // bounds.height = Math.ceil(bounds.height / 20) * 20;
    // for (const element of root) {
    //   elements[element.id].bounds.x -= bounds.x + bounds.width / 2;
    //   elements[element.id].bounds.y -= bounds.y + bounds.height / 2;
    // }

    // let width = 0;
    // let height = 0;
    // for (const element of root) {
    //   width = Math.max(Math.abs(element.bounds.x), Math.abs(element.bounds.x + element.bounds.width), width);
    //   height = Math.max(Math.abs(element.bounds.y), Math.abs(element.bounds.y + element.bounds.height), height);
    // }

    // const computedBounds = { x: -width, y: -height, width: width * 2, height: height * 2 };

    const elements: IUMLElement[] = [...model.elements, ...model.relationships];

    return {
      diagram: {
        ownedElements: model.elements.filter(e => !e.owner).map(element => element.id),
        ownedRelationships: model.relationships.map(element => element.id),
      },
      // diagram: {
      //   ...(() => {
      //     const d = new UMLDiagram();
      //     Object.assign(d, {
      //       type: model.type,
      //       bounds: computedBounds,
      //     });
      //     return d;
      //   })(),
      //   ownedElements: root.filter(element => !(element instanceof UMLRelationship)).map(element => element.id),
      //   ownedRelationships: root.filter(element => element instanceof UMLRelationship).map(element => element.id),
      // },
      interactive: [...model.interactive.elements, ...model.interactive.relationships],
      elements: elements.reduce((acc, val) => ({ ...acc, [val.id]: val }), {}),
      assessments: model.assessments.reduce<AssessmentState>((r, o) => ({ ...r, [o.modelElementId]: o }), {}),
    };
  }

  static toModel(state: ModelState): UMLModel {
    const elements: Array<IUMLElement & { type: UMLElementType }> = [];
    const relationships: IUMLRelationship[] = [];

    for (const element of Object.values(state.elements)) {
      if (UMLRelationshipRepository.isUMLRelationship(element)) {
        relationships.push({ ...element });
      }
      if (UMLElementRepository.isUMLElement(element)) {
        elements.push({ ...element });
      }
    }

    // const elements = UMLElementRepository.read(state.elements).filter(element => !(element instanceof UMLRelationship));
    // const relationships = UMLRelationshipRepository.read(state.elements);
    // const root = elements.filter(element => !element.owner);

    // const parseElement = (element: UMLElement): Other[] => {
    //   const cont: UMLElement[] =
    //     element instanceof UMLContainer ? element.ownedElements.map(id => elements.find(ee => ee.id === id)!) : [];
    //   const { element: result, children } = element.toUMLElement(element, cont);
    //   return [result as Other, ...children.reduce<Other[]>((r2, e3) => [...r2, ...parseElement(e3)], [])];
    // };

    // const e = root.reduce<Other[]>((r2, e2) => [...r2, ...parseElement(e2)], []);

    // // const r = relationships.map<IUMLRelationship>(relationship =>
    // //   (relationship.constructor as typeof UMLRelationship).toUMLRelationship(relationship),
    // // );
    // const r = [] as IUMLRelationship[];

    const interactive: Selection = {
      elements: elements.filter(element => state.interactive.includes(element.id)).map<string>(element => element.id),
      relationships: relationships
        .filter(element => state.interactive.includes(element.id))
        .map<string>(element => element.id),
    };

    // const bounds = computeBoundingBoxForElements(root);
    // for (const element of e) {
    //   if (element.owner) {
    //     const absolutePosition = UMLElementRepository.getAbsolutePosition(state.elements)(element.id);
    //     element.bounds.x = absolutePosition.x;
    //     element.bounds.y = absolutePosition.y;
    //   }
    //   element.bounds.x -= bounds.x;
    //   element.bounds.y -= bounds.y;
    // }
    // for (const relationship of r) {
    //   relationship.bounds.x -= bounds.x;
    //   relationship.bounds.y -= bounds.y;
    // }

    // const size = {
    //   width: bounds.width,
    //   height: bounds.height,
    // };
    const size = {
      width: state.diagram.bounds.width,
      height: state.diagram.bounds.height,
    };

    const assessments = Object.keys(state.assessments).map<Assessment>(id => ({
      modelElementId: id,
      elementType: state.elements[id].type as UMLElementType,
      score: state.assessments[id].score,
      feedback: state.assessments[id].feedback,
    }));

    return {
      version: '2.0.0',
      size,
      type: state.diagram.type,
      interactive,
      elements,
      relationships,
      assessments,
    };
  }
}
