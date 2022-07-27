import { Action } from '../../utils/actions/actions';
import { IBoundary } from '../../utils/geometry/boundary';
import { IPath } from '../../utils/geometry/path';

export const enum UMLRelationshipActionTypes {
  LAYOUT = '@@relationship/LAYOUT',
  STARTWAYPOINTSLAYOUT = '@@relationship/waypoints/START',
  ENDWAYPOINTSLAYOUT = '@@relationship/waypoints/END',
}

export type UMLRelationshipActions = LayoutAction | StartWaypointsAction | EndWaypointsAction;

export type LayoutAction = Action<UMLRelationshipActionTypes.LAYOUT> & {
  payload: {
    id: string;
    path: IPath;
    bounds: IBoundary;
  };
};

export type StartWaypointsAction = Action<UMLRelationshipActionTypes.STARTWAYPOINTSLAYOUT> & {
  payload: {
    id: string;
    path: IPath;
  };
};

export type EndWaypointsAction = Action<UMLRelationshipActionTypes.ENDWAYPOINTSLAYOUT> & {
  payload: {
    id: string;
  };
};
