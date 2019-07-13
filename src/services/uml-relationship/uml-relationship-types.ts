import { Action } from '../../utils/actions/actions';
import { IBoundary } from '../../utils/geometry/boundary';
import { IPath } from '../../utils/geometry/path';

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
