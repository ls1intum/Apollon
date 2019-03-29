import { ActionCreator } from 'redux';
import { ModelState } from '../../components/store/model-state';
import { ElementType } from '../../packages/element-type';
import { Elements } from '../../packages/elements';
import { Point } from '../../utils/geometry/point';
import { notEmpty } from '../../utils/not-empty';
import { Element, IElement } from './element';
import {
  ChangeAction,
  CreateAction,
  DeleteAction,
  ElementActionTypes,
  ElementState,
  HoverAction,
  LeaveAction,
  MakeInteractiveAction,
  MoveAction,
  RenameAction,
  ResizeAction,
  SelectAction,
  UpdateAction,
} from './element-types';

export class ElementRepository {
  static create = (element: Element): CreateAction => ({
    type: ElementActionTypes.CREATE,
    payload: { element },
  });

  static hover = (id: string, internal: boolean = false): HoverAction => ({
    type: ElementActionTypes.HOVER,
    payload: { id, internal },
  });

  static leave = (id: string, internal: boolean = false): LeaveAction => ({
    type: ElementActionTypes.LEAVE,
    payload: { id, internal },
  });

  static select = (id: string | null, toggle: boolean = false): SelectAction => ({
    type: ElementActionTypes.SELECT,
    payload: { id, toggle },
  });

  static makeInteractive = (id: string): MakeInteractiveAction => ({
    type: ElementActionTypes.MAKE_INTERACTIVE,
    payload: { id },
  });

  static resize: ActionCreator<ResizeAction> = (id: string, delta: { width: number; height: number }) => ({
    type: ElementActionTypes.RESIZE,
    payload: { id, delta },
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

  static getById = (state: ElementState) => (id: string): Element | null => {
    const element = state[id];
    if (!element) return null;

    const ElementClass = Elements[element.type as ElementType];
    if (!ElementClass) return null;

    return new ElementClass(element);
  };

  static read = (state: ModelState): Element[] => {
    const elements = Object.keys(state.elements).reduce<ElementState>((r, e) => {
      if (state.elements[e].type in ElementType) return { ...r, [e]: state.elements[e] };
      return r;
    }, {});

    return Object.values(elements)
      .map<Element | null>(element => ElementRepository.getById(state.elements)(element.id))
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

  static change: ActionCreator<ChangeAction> = (id: string, kind: ElementType) => ({
    type: ElementActionTypes.CHANGE,
    payload: { id, kind },
  });

  static rename: ActionCreator<RenameAction> = (id: string, name: string) => ({
    type: ElementActionTypes.RENAME,
    payload: { id, name },
  });

  static update = (id: string, values: Partial<Element>): UpdateAction => ({
    type: ElementActionTypes.UPDATE,
    payload: { id, values },
  });

  static delete = (id: string | null): DeleteAction => ({
    type: ElementActionTypes.DELETE,
    payload: { id },
  });
}
