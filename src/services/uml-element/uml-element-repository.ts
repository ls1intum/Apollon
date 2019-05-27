import { ActionCreator, compose } from 'redux';
import { ModelState } from '../../components/store/model-state';
import { UMLElementType } from '../../packages/uml-element-type';
import { UMLElements } from '../../packages/uml-elements';
import { AsyncAction } from '../../utils/actions/actions';
import { Point } from '../../utils/geometry/point';
import { notEmpty } from '../../utils/not-empty';
import { UMLContainer } from '../uml-container/uml-container';
import { UMLContainerRepository } from '../uml-container/uml-container-repository';
import { Connectable } from './connectable/connectable-repository';
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

  static create = <T extends IUMLElement>(value: T | T[], owner?: string): AsyncAction<void> => async dispatch => {
    const values = Array.isArray(value) ? value : [value];
    dispatch<CreateAction<T>>({
      type: UMLElementActionTypes.CREATE,
      payload: { values },
    });

    const ids = values.filter(v => !v.owner).map(v => v.id);
    if (ids.length) {
      dispatch(UMLContainerRepository.append(ids, owner));
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

  static deleteSelection = (): AsyncAction => async (dispatch, getState) => {
    dispatch<DeleteAction>({
      type: UMLElementActionTypes.DELETE,
      payload: { ids: getState().selected },
    });
  };

  static clone = (element: UMLElement, elements: UMLElement[]): UMLElement[] => {
    if (!UMLContainerRepository.isUMLContainer(element)) {
      return [element.clone()];
    }

    const result: UMLElement[] = [];
    const clone = element.clone<UMLContainer>();
    const { ownedElements } = element;
    for (const id of ownedElements) {
      const child = elements.find(prev => prev.id === id);
      if (!child) {
        continue;
      }

      const [clonedChild, ...clonedChildren] = UMLElementRepository.clone(child, elements);
      clonedChild.owner = clone.id;

      const index = clone.ownedElements.findIndex(x => x === id);
      clone.ownedElements[index] = clonedChild.id;
      result.push(clonedChild, ...clonedChildren);
    }

    return [clone, ...result];
  };

  static filterRoots = (ids: string[], elements: UMLElementState): string[] => {
    const getSelection = (root: IUMLElement): string[] => {
      if (ids.includes(root.id)) return [root.id];

      if (UMLContainerRepository.isUMLContainer(root)) {
        return root.ownedElements.reduce<string[]>(
          (selection, id) => [...selection, ...getSelection(elements[id])],
          [],
        );
      }
      return [];
    };

    return Object.values(elements)
      .filter(element => !element.owner)
      .reduce<string[]>((selection, element) => [...selection, ...getSelection(element)], []);
  };

  static getAbsolutePosition = (id: string): AsyncAction<Point> => (dispatch, getState) => {
    const { elements } = getState();
    let element = elements[id];
    let position = new Point(element.bounds.x, element.bounds.y);
    while (element.owner) {
      element = elements[element.owner];
      position = position.add(element.bounds.x, element.bounds.y);
    }
    return position;
  };

  static duplicate = (id: string, parent?: string): DuplicateAction => ({
    type: UMLElementActionTypes.DUPLICATE,
    payload: { id, parent },
  });

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
