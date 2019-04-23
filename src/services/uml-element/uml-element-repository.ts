import { ActionCreator, compose } from 'redux';
import { ModelState } from '../../components/store/model-state';
import { UMLElementType } from '../../packages/uml-element-type';
import { UMLElements } from '../../packages/uml-elements';
import { AsyncAction } from '../../utils/actions/actions';
import { Point } from '../../utils/geometry/point';
import { notEmpty } from '../../utils/not-empty';
import { UMLContainer } from '../uml-container/uml-container';
import { AppendAction, UMLContainerActionTypes } from '../uml-container/uml-container-types';
import { Hoverable } from './hoverable/hoverable-repository';
import { Interactable } from './interactable/interactable-repository';
import { Movable } from './movable/movable-repository';
import { Resizable } from './resizable/resizable-repository';
import { Selectable } from './selectable/selectable-repository';
import { IUMLElement, UMLElement } from './uml-element';
import {
  ChangeAction,
  CreateAction,
  DeleteAction,
  DuplicateAction,
  RenameAction,
  UMLElementActionTypes,
  UMLElementState,
  UpdateAction,
} from './uml-element-types';
import { Updatable } from './updatable/updatable-repository';
import { Connectable } from './connectable/connectable-repository';

type UMLElementRepository = typeof Repository &
  ReturnType<typeof Hoverable> &
  ReturnType<typeof Selectable> &
  ReturnType<typeof Movable> &
  ReturnType<typeof Resizable> &
  ReturnType<typeof Connectable> &
  ReturnType<typeof Interactable> &
  ReturnType<typeof Updatable>;

const enhance = compose<UMLElementRepository>(
  Hoverable,
  Selectable,
  Movable,
  Resizable,
  Connectable,
  Interactable,
  Updatable,
);

class Repository {
  static isUMLElement(element: IUMLElement): element is IUMLElement & { type: UMLElementType } {
    return element.type in UMLElementType;
  }

  static create = <T extends IUMLElement>(value: T | T[] , owner?: string): AsyncAction<void> => async (dispatch, getState) => {
    const values = Array.isArray(value) ? value : [value];
    dispatch<CreateAction<T>>({
      type: UMLElementActionTypes.CREATE,
      payload: { values },
    });

    const ids = values.filter(v => !v.owner).map(v => v.id);
    if (ids.length) {
      dispatch<AppendAction>({
        type: UMLContainerActionTypes.APPEND,
        payload: {
          ids,
          owner: owner || getState().diagram.id,
        },
      });
    }
  };

  static update = <T extends IUMLElement>(id: string | string[], values: Partial<T>): UpdateAction<T> => ({
    type: UMLElementActionTypes.UPDATE,
    payload: { ids: Array.isArray(id) ? id : [id], values },
  });

  static delete = (id: string | string[]): DeleteAction => ({
    type: UMLElementActionTypes.DELETE,
    payload: { ids: Array.isArray(id) ? id : [id] },
  });

  static deleteSelection = (): AsyncAction<DeleteAction> => (dispatch, getState) =>
    dispatch({
      type: UMLElementActionTypes.DELETE,
      payload: { ids: getState().selected },
    });

  static duplicate = (id: string, parent?: string): DuplicateAction => ({
    type: UMLElementActionTypes.DUPLICATE,
    payload: { id, parent },
  });

  static getAbsolutePosition = (state: UMLElementState) => (id: string): Point => {
    let element = state[id];
    let position = new Point(element.bounds.x, element.bounds.y);
    while (element.owner) {
      element = state[element.owner];
      position = position.add(element.bounds.x, element.bounds.y);
    }
    return position;
  };

  static getRelativePosition = (state: UMLElementState) => (owner: string, position: Point): Point => {
    let parent: IUMLElement | null = state[owner];
    do {
      position = position.subtract(parent.bounds.x, parent.bounds.y);
      parent = parent.owner ? state[parent.owner] : null;
    } while (parent);
    return position;
  };

  static get = (element?: IUMLElement): UMLElement | null => {
    if (!element) {
      return null;
    }

    if (Repository.isUMLElement(element)) {
      const Classifier = UMLElements[element.type];
      return new Classifier(element);
    }
    // if (element.type in RelationshipType) {
    //   return new Relationships[element.type as RelationshipType]();
    // }
    return null;
  };

  static getById = (state: UMLElementState) => (id: string): UMLElement | null => {
    const element = state[id];
    return Repository.get(element);

    // if (!element) return null;

    // if (element.type in RelationshipType) {
    //   return RelationshipRepository.getById(state)(id);
    // }

    // const ElementClass = Elements[element.type as ElementType];
    // if (!ElementClass) return null;

    // return new ElementClass(element);
  };

  static getByIds = (state: UMLElementState) => (ids: string[]): UMLElement[] => {
    return ids.map(Repository.getById(state)).filter(notEmpty);
  };

  static read = (state: UMLElementState): UMLElement[] => {
    return Object.keys(state)
      .map(Repository.getById(state))
      .filter(notEmpty);
  };

  static parse = (state: ModelState): { [id: string]: UMLElement } => {
    return Object.values(state.elements).reduce<{ [id: string]: UMLElement }>((result, element) => {
      if (!(element.type in UMLElementType)) return result;
      const el = Repository.getById(state.elements)(element.id);
      if (!el) return result;

      return {
        ...result,
        [element.id]: el,
      };
    }, {});
  };

  static getChildren = (state: UMLElementState) => (id: string): UMLElement[] => {
    const owner = Repository.getById(state)(id);
    if (!owner) return [];

    if (owner instanceof UMLContainer) {
      return owner.ownedElements.reduce<UMLElement[]>(
        (acc, element) => [...acc, ...Repository.getChildren(state)(element)],
        [owner],
      );
    }
    return [owner];
  };

  static change: ActionCreator<ChangeAction> = (id: string, kind: UMLElementType) => ({
    type: UMLElementActionTypes.CHANGE,
    payload: { id, kind },
  });

  static rename: ActionCreator<RenameAction> = (id: string, name: string) => ({
    type: UMLElementActionTypes.RENAME,
    payload: { id, name },
  });
}

export const UMLElementRepository = enhance(Repository);
