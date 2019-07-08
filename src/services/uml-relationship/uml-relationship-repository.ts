import { UMLRelationships } from '../../packages/uml-relationships';
import { AsyncAction } from '../../utils/actions/actions';
import { IBoundary } from '../../utils/geometry/boundary';
import { IPath } from '../../utils/geometry/path';
import { IUMLElement } from '../uml-element/uml-element';
import { Reconnectable } from './reconnectable/reconnectable-repository';
import { ReconnectableActionTypes, ReconnectAction } from './reconnectable/reconnectable-types';
import { IUMLRelationship, UMLRelationship } from './uml-relationship';
import { LayoutAction, UMLRelationshipActionTypes } from './uml-relationship-types';

const Repository = {
  get: (element?: IUMLElement): UMLRelationship | null => {
    if (!element) {
      return null;
    }

    if (UMLRelationship.isUMLRelationship(element)) {
      const Classifier = UMLRelationships[element.type];

      return new Classifier(element);
    }

    return null;
  },

  layout: (id: string, path: IPath, bounds: IBoundary): LayoutAction => ({
    type: UMLRelationshipActionTypes.LAYOUT,
    payload: { id, path, bounds },
    undoable: false,
  }),

  flip: (id?: string | string[]): AsyncAction => (dispatch, getState) => {
    const { selected, elements } = getState();
    const ids = id ? (Array.isArray(id) ? id : [id]) : selected;
    const connections = ids.map(r => {
      const relationship = elements[r] as IUMLRelationship;
      const source = { element: relationship.target.element, direction: relationship.target.direction };
      const target = { element: relationship.source.element, direction: relationship.source.direction };
      return { id: relationship.id, source, target };
    });

    dispatch<ReconnectAction>({
      type: ReconnectableActionTypes.RECONNECT,
      payload: { connections },
      undoable: true,
    });
  },
};

export const UMLRelationshipRepository = {
  ...Repository,
  ...Reconnectable,
};
