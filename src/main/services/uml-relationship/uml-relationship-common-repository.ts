import { UMLRelationships } from '../../packages/uml-relationships';
import { AsyncAction } from '../../utils/actions/actions';
import { IBoundary } from '../../utils/geometry/boundary';
import { IPath } from '../../utils/geometry/path';
import { IUMLElement, UMLElement } from '../uml-element/uml-element';
import { ReconnectableActionTypes, ReconnectAction } from './reconnectable/reconnectable-types';
import { IUMLRelationship, UMLRelationship } from './uml-relationship';
import {
  EndWaypointsAction,
  LayoutAction,
  StartWaypointsAction,
  UMLRelationshipActionTypes,
  WaypointLayoutAction,
} from './uml-relationship-types';
import { UMLElementType, UMLRelationshipType } from '../..';
import { UMLElements } from '../../packages/uml-elements';

export const UMLRelationshipCommonRepository = {
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

  getById:
    (id: string): AsyncAction<UMLElement | null> =>
    (dispatch, getState) => {
      const { elements } = getState();
      return UMLRelationshipCommonRepository.get(elements[id]);
    },

  getSupportedConnectionsForElements: (elements: UMLElement | UMLElement[]): UMLRelationshipType[] => {
    const elementsArray = Array.isArray(elements) ? elements : [elements];

    if (!(elementsArray.length > 0)) {
      return [];
    }

    // determine the common supported connection types
    return elementsArray.reduce(
      (supportedConnections: UMLRelationshipType[], element: UMLElement) => {
        const elementSupportedConnections: UMLRelationshipType[] =
          UMLElements[element.type as UMLElementType].supportedRelationships;
        return supportedConnections.filter((supportedConnection) =>
          elementSupportedConnections.includes(supportedConnection),
        );
      },
      UMLElements[elementsArray[0].type as UMLElementType].supportedRelationships as UMLRelationshipType[],
    );
  },

  layout: (id: string, path: IPath, bounds: IBoundary): LayoutAction => ({
    type: UMLRelationshipActionTypes.LAYOUT,
    payload: { id, path, bounds },
    undoable: false,
  }),

  layoutWaypoints: (id: string, path: IPath, bounds: IBoundary): WaypointLayoutAction => ({
    type: UMLRelationshipActionTypes.WAYPOINTLAYOUT,
    payload: { id, path, bounds },
    undoable: false,
  }),

  flip:
    (id?: string | string[]): AsyncAction =>
    (dispatch, getState) => {
      const { selected, elements } = getState();
      const ids = id ? (Array.isArray(id) ? id : [id]) : selected;
      const connections = ids.map((r) => {
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

  startWaypointsLayout:
    (id: string, path: IPath, bounds: IBoundary): AsyncAction =>
    (dispatch) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : undefined;
      if (ids && !ids.length) {
        return;
      }

      dispatch<StartWaypointsAction>({
        type: UMLRelationshipActionTypes.STARTWAYPOINTSLAYOUT,
        payload: { id, path, bounds },
        undoable: false,
      });
    },

  endWaypointsLayout:
    (id: string): AsyncAction =>
    (dispatch) => {
      if (!id.length) {
        return;
      }

      dispatch<EndWaypointsAction>({
        type: UMLRelationshipActionTypes.ENDWAYPOINTSLAYOUT,
        payload: { id },
        undoable: false,
      });
    },
};
