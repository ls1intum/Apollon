import { AsyncAction } from '../../utils/actions/actions';
import { clone, filterRoots } from '../../utils/geometry/tree';
import { notEmpty } from '../../utils/not-empty';
import { UMLElement } from '../uml-element/uml-element';
import { UMLElementRepository } from '../uml-element/uml-element-repository';
import { CopyAction, CopyActionTypes, PasteAction } from './copy-types';

export class CopyRepository {
  static copy = (id?: string | string[]): AsyncAction => (dispatch, getState) => {
    const { elements, selected } = getState();
    const ids = id ? (Array.isArray(id) ? id : [id]) : selected;
    const state = Object.values(elements)
      .map(x => UMLElementRepository.get(x))
      .filter(notEmpty);

    const roots = filterRoots(ids, elements);
    const result: UMLElement[] = [];

    for (const root of roots) {
      const element = UMLElementRepository.get(elements[root]);
      if (!element) {
        continue;
      }
      const position = dispatch(UMLElementRepository.getAbsolutePosition(element.id));
      element.bounds.x = position.x + 10;
      element.bounds.y = position.y + 10;
      element.owner = null;

      const clones = clone(element, state);
      result.push(...clones);
    }

    dispatch<CopyAction>({
      type: CopyActionTypes.COPY,
      payload: result.map(x => ({ ...x })),
      undoable: false,
    });
  };

  static paste = (): AsyncAction => (dispatch, getState) => {
    const { copy } = getState();

    dispatch<PasteAction>({ type: CopyActionTypes.PASTE, payload: {}, undoable: false });
    dispatch(UMLElementRepository.create(copy));
  };
}
