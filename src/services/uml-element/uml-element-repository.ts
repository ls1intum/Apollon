import { UMLElementType } from '../../packages/uml-element-type';
import { UMLElements } from '../../packages/uml-elements';
import { AsyncAction } from '../../utils/actions/actions';
import { Point } from '../../utils/geometry/point';
import { filterRoots, getChildren } from '../../utils/geometry/tree';
import { UMLContainerRepository } from '../uml-container/uml-container-repository';
import { RemoveAction } from '../uml-container/uml-container-types';
import { Connectable } from './connectable/connectable-repository';
import { Hoverable } from './hoverable/hoverable-repository';
import { Interactable } from './interactable/interactable-repository';
import { Movable } from './movable/movable-repository';
import { Resizable } from './resizable/resizable-repository';
import { Selectable } from './selectable/selectable-repository';
import { IUMLElement, UMLElement } from './uml-element';
import { CreateAction, DeleteAction, UMLElementActionTypes, UpdateAction } from './uml-element-types';
import { Updatable } from './updatable/updatable-repository';

const Repository = {
  /** Checks whether an `IUMLElement` is of type `UMLElementType` */
  isUMLElement: (element: IUMLElement): element is IUMLElement & { type: UMLElementType } =>
    element.type in UMLElementType,

  /**
   * Creates new instances of `UMLElements`
   *
   * @param values - An array of new values for the instances to create.
   * @param [owner] - Specify the owner for the new elements.
   */
  create: <T extends IUMLElement>(value: T | T[], owner?: string): AsyncAction => async dispatch => {
    const values = Array.isArray(value) ? value : [value];
    dispatch<CreateAction<T>>({
      type: UMLElementActionTypes.CREATE,
      payload: { values },
    });

    const ids = values.filter(v => !v.owner).map(v => v.id);
    if (ids.length) {
      dispatch(UMLContainerRepository.append(ids, owner));
    }
  },

  /** Read an UMLElement */
  get: (element?: IUMLElement): UMLElement | null => {
    if (!element) {
      return null;
    }

    if (Repository.isUMLElement(element)) {
      const Classifier = UMLElements[element.type];

      return new Classifier(element);
    }

    return null;
  },

  /** Read an UMLElement by id */
  getById: (id: string): AsyncAction<UMLElement | null> => (dispatch, getState) => {
    const { elements } = getState();

    return Repository.get(elements[id]);
  },

  /** Update existing elements */
  update: <T extends IUMLElement>(id: string | string[], values: Partial<T>): UpdateAction<T> => ({
    type: UMLElementActionTypes.UPDATE,
    payload: { values: (Array.isArray(id) ? id : [id]).map(i => ({ id: i, ...values })) },
  }),

  /** Delete existing elements */
  delete: (id?: string | string[]): AsyncAction => (dispatch, getState) => {
    const { elements, selected } = getState();
    const ids = id ? (Array.isArray(id) ? id : [id]) : selected;

    const roots = filterRoots(ids, elements);
    if (!roots.length) {
      return;
    }

    dispatch<RemoveAction>(UMLContainerRepository.remove(roots));

    dispatch<DeleteAction>({
      type: UMLElementActionTypes.DELETE,
      payload: { ids: getChildren(roots, elements) },
    });
  },

  /** Composes the absolute position of an element */
  getAbsolutePosition: (id: string): AsyncAction<Point> => (dispatch, getState) => {
    const { elements } = getState();
    let element = elements[id];
    let position = new Point(element.bounds.x, element.bounds.y);
    while (element.owner) {
      element = elements[element.owner];
      position = position.add(element.bounds.x, element.bounds.y);
    }

    return position;
  },
};

export const UMLElementRepository = {
  ...Repository,
  ...Hoverable,
  ...Selectable,
  ...Movable,
  ...Resizable,
  ...Connectable,
  ...Interactable,
  ...Updatable,
};
