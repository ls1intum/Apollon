import { ActionCreator } from 'redux';
import { ModelState } from '../../components/Store';
import {
  ActionTypes,
  State as ElementState,
  HoverAction,
  LeaveAction,
  CreateAction,
  UpdateAction,
  MoveAction,
  ResizeAction,
  DeleteAction,
  SelectAction,
  MakeInteractiveAction,
  ChangeAction,
  RenameAction,
} from './types';
import Element from '.';
import * as Plugins from '../plugins';
import Point from '../geometry/Point';
import ElementKind from '../plugins/ElementKind';
import { elements } from './../plugins/elements';
import { notEmpty } from '../utils';

class Repository {
  static create = (element: Element): CreateAction => ({
    type: ActionTypes.CREATE,
    payload: { element },
  });

  static hover = (id: string, internal: boolean = false): HoverAction => ({
    type: ActionTypes.HOVER,
    payload: { id, internal },
  });

  static leave = (id: string, internal: boolean = false): LeaveAction => ({
    type: ActionTypes.LEAVE,
    payload: { id, internal },
  });

  static select = (
    id: string | null,
    toggle: boolean = false
  ): SelectAction => ({
    type: ActionTypes.SELECT,
    payload: { id, toggle },
  });

  static makeInteractive = (id: string): MakeInteractiveAction => ({
    type: ActionTypes.MAKE_INTERACTIVE,
    payload: { id },
  });

  static resize: ActionCreator<ResizeAction> = (
    id: string,
    delta: { width: number; height: number }
  ) => ({
    type: ActionTypes.RESIZE,
    payload: { id, delta },
  });

  static move = (
    id: string | null,
    delta: { x: number; y: number }
  ): MoveAction => ({
    type: ActionTypes.MOVE,
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

  static getById = (state: ElementState) => (id: string): Element | null => {
    const element = state[id];
    if (!element) return null;

    const ElementClass = elements[element.type as ElementKind];
    if (!ElementClass) return null;

    return new ElementClass(element);
  };

  static read = (state: ModelState): Element[] => {
    const elements = Object.keys(state.elements).reduce<ElementState>(
      (r, e) => {
        if (!('path' in state.elements[e]))
          return { ...r, [e]: state.elements[e] };
        return r;
      },
      {}
    );

    return Object.values(elements)
      .map<Element | null>(element =>
        Repository.getById(state.elements)(element.id)
      )
      .filter(notEmpty);
  };

  static parse = (state: ModelState): ElementState => {
    return Object.values(state.elements).reduce<ElementState>(
      (result, element) => {
        if ('path' in element) return result;

        return {
          ...result,
          [element.id]: Object.setPrototypeOf(
            element,
            (<any>Plugins)[element.type].prototype
          ),
        };
      },
      {}
    );
  };

  static change: ActionCreator<ChangeAction> = (
    id: string,
    kind: ElementKind
  ) => ({
    type: ActionTypes.CHANGE,
    payload: { id, kind },
  });

  static rename: ActionCreator<RenameAction> = (id: string, name: string) => ({
    type: ActionTypes.RENAME,
    payload: { id, name },
  });

  static update = (id: string, values: Partial<Element>): UpdateAction => ({
    type: ActionTypes.UPDATE,
    payload: { id, values },
  });

  static delete = (id: string | null): DeleteAction => ({
    type: ActionTypes.DELETE,
    payload: { id },
  });
}

export default Repository;
