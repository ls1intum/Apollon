import { Action } from '../../utils/actions/actions.js';
import { IBoundary } from '../../utils/geometry/boundary.js';
import { IPath } from '../../utils/geometry/path.js';

export const enum UMLRelationshipActionTypes {
  LAYOUT = '@@relationship/LAYOUT',
}

export type UMLRelationshipActions = LayoutAction;

export type LayoutAction = Action<UMLRelationshipActionTypes.LAYOUT> & {
  payload: {
    id: string;
    path: IPath;
    bounds: IBoundary;
  };
};
