import { ActionCreator } from 'redux';
import { State } from '../../components/Store';
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
} from './types';
import Element from '.';
import * as Plugins from '../plugins';

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

  static resize: ActionCreator<ResizeAction> = (
    id: string,
    size: { width: number; height: number }
  ) => ({
    type: ActionTypes.RESIZE,
    payload: { id, size },
  });

  static move = (
    id: string | null,
    delta: { x: number; y: number }
  ): MoveAction => ({
    type: ActionTypes.MOVE,
    payload: { id, delta },
  });

  static getById = (state: ElementState) => (id: string): Element => {
    const element = { ...state[id] };
    if (!Object.keys(element).length) return element;
    return Object.setPrototypeOf(
      element,
      (<any>Plugins)[element.kind].prototype
    );
  };

  static read = (state: State): Element[] => {
    const elements = Object.keys(state.elements).reduce<ElementState>(
      (r, e) => {
        if (state.elements[e].base !== 'Relationship')
          return { ...r, [e]: state.elements[e] };
        return r;
      },
      {}
    );

    return Object.values(elements).map((e: Element) =>
      Object.setPrototypeOf(e, (<any>Plugins)[e.kind].prototype)
    );
  };

  static parse = (state: State): ElementState => {
    return Object.values(state.elements).reduce<ElementState>(
      (result, element) => {
        if (element.base === 'Relationship') return result;

        return {
          ...result,
          [element.id]: Object.setPrototypeOf(
            element,
            (<any>Plugins)[element.kind].prototype
          ),
        };
      },
      {}
    );
  };

  static update: ActionCreator<UpdateAction> = (element: Element) => ({
    type: ActionTypes.UPDATE,
    payload: { element },
  });

  static delete = (id: string | null): DeleteAction => ({
    type: ActionTypes.DELETE,
    payload: { id },
  });
}

export default Repository;
