import { Action } from '../../utils/actions/actions';
import { IBoundary } from '../../utils/geometry/boundary';
import { IPath } from '../../utils/geometry/path';

export const enum UMLRelationshipActionTypes {
  LAYOUT = '@@relationship/LAYOUT',
  WAYPOINTLAYOUT = '@@relationship/WAYPOINTLAYOUT',
  STARTWAYPOINTSLAYOUT = '@@relationship/waypoints/START',
  ENDWAYPOINTSLAYOUT = '@@relationship/waypoints/END',
}

export type UMLRelationshipActions = LayoutAction | StartWaypointsAction | EndWaypointsAction | WaypointLayoutAction;

export type LayoutAction = Action<UMLRelationshipActionTypes.LAYOUT> & {
  payload: {
    id: string;
    path: IPath;
    bounds: IBoundary;
  };
};

export type WaypointLayoutAction = Action<UMLRelationshipActionTypes.WAYPOINTLAYOUT> & {
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
    bounds: IBoundary;
  };
};

export type EndWaypointsAction = Action<UMLRelationshipActionTypes.ENDWAYPOINTSLAYOUT> & {
  payload: {
    id: string;
  };
};
