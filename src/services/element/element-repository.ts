import { ActionCreator } from 'redux';
import { ModelState } from '../../components/store/model-state';
import { ElementType } from '../../packages/element-type';
import { Elements } from '../../packages/elements';
import { RelationshipType } from '../../packages/relationship-type';
import { Point } from '../../utils/geometry/point';
import { notEmpty } from '../../utils/not-empty';
import { Container } from '../container/container';
import { RelationshipRepository } from '../relationship/relationship-repository';
import { Element, IElement } from './element';
import {
  ChangeAction,
  CreateAction,
  DeleteAction,
  DuplicateAction,
  ElementActionTypes,
  ElementState,
  HoverAction,
  LeaveAction,
  MakeInteractiveAction,
  MoveAction,
  RenameAction,
  ResizeAction,
  ResizedAction,
  SelectAction,
  UpdateAction,
} from './element-types';

export class ElementRepository {
  static create = (element: Element): CreateAction => ({
    type: ElementActionTypes.CREATE,
    payload: { element },
  });

  static duplicate = (id: string, parent?: string): DuplicateAction => ({
    type: ElementActionTypes.DUPLICATE,
    payload: { id, parent },
  });

  static hover = (id: string, internal: boolean = false): HoverAction => ({
    type: ElementActionTypes.HOVER,
    payload: { id, internal },
  });

  static leave = (id: string, internal: boolean = false): LeaveAction => ({
    type: ElementActionTypes.LEAVE,
    payload: { id, internal },
  });

  static select = (id: string | null, toggle: boolean = false, keep: boolean = false): SelectAction => ({
    type: ElementActionTypes.SELECT,
    payload: { id, toggle, keep },
  });

  static makeInteractive = (id: string): MakeInteractiveAction => ({
    type: ElementActionTypes.MAKE_INTERACTIVE,
    payload: { id },
  });

  static resize = (id: string, size: { width: number; height: number }): ResizeAction => ({
    type: ElementActionTypes.RESIZE,
    payload: { id, size },
  });

  static resized = (id: string): ResizedAction => ({
    type: ElementActionTypes.RESIZED,
    payload: { id },
  });

  static move = (id: string | null, delta: { x: number; y: number }): MoveAction => ({
    type: ElementActionTypes.MOVE,
    payload: { id, delta },
  });

  static getAbsolutePosition = (state: ElementState) => (id: string): Point => {
    let element = state[id];
    let position = new Point(element.bounds.x, element.bounds.y);
    while (element.owner) {
      element = state[element.owner];
      position = position.add(element.bounds.x, element.bounds.y);
    }
    return position;
  };

  static getRelativePosition = (state: ElementState) => (owner: string, position: Point): Point => {
    let parent: IElement | null = state[owner];
    do {
      position = position.subtract(parent.bounds.x, parent.bounds.y);
      parent = parent.owner ? state[parent.owner] : null;
    } while (parent);
    return position;
  };

  static getById = (state: ElementState) => (id: string): Element | null => {
    const element = state[id];
    if (!element) return null;

    if (element.type in RelationshipType) {
      return RelationshipRepository.getById(state)(id);
    }

    const ElementClass = Elements[element.type as ElementType];
    if (!ElementClass) return null;

    return new ElementClass(element);
  };

  static getByIds = (state: ElementState) => (ids: string[]): Element[] => {
    return ids.map(ElementRepository.getById(state)).filter(notEmpty);
  };

  static read = (state: ElementState): Element[] => {
    return Object.keys(state)
      .map(ElementRepository.getById(state))
      .filter(notEmpty);
  };

  static parse = (state: ModelState): { [id: string]: Element } => {
    return Object.values(state.elements).reduce<{ [id: string]: Element }>((result, element) => {
      if (!(element.type in ElementType)) return result;
      const el = ElementRepository.getById(state.elements)(element.id);
      if (!el) return result;

      return {
        ...result,
        [element.id]: el,
      };
    }, {});
  };

  static getChildren = (state: ElementState) => (id: string): Element[] => {
    const owner = ElementRepository.getById(state)(id);
    if (!owner) return [];

    if (owner instanceof Container) {
      return owner.ownedElements.reduce<Element[]>(
        (acc, element) => [...acc, ...ElementRepository.getChildren(state)(element)],
        [owner],
      );
    }
    return [owner];
  };

  static change: ActionCreator<ChangeAction> = (id: string, kind: ElementType) => ({
    type: ElementActionTypes.CHANGE,
    payload: { id, kind },
  });

  static rename: ActionCreator<RenameAction> = (id: string, name: string) => ({
    type: ElementActionTypes.RENAME,
    payload: { id, name },
  });

  static update = (id: string, values: any): UpdateAction => ({
    type: ElementActionTypes.UPDATE,
    payload: { id, values },
  });

  static delete = (id: string | null): DeleteAction => ({
    type: ElementActionTypes.DELETE,
    payload: { id },
  });
}
