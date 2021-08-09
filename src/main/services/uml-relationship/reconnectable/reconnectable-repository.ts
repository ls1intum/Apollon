import { AsyncAction } from '../../../utils/actions/actions';
import { notEmpty } from '../../../utils/not-empty';
import { IUMLElementPort } from '../../uml-element/uml-element-port';
import { Connection } from '../connection';
import { IUMLRelationship, UMLRelationship } from '../uml-relationship';
import {
  ReconnectableActionTypes,
  ReconnectAction,
  ReconnectEndAction,
  ReconnectStartAction,
} from './reconnectable-types';
import { UMLRelationshipCommonRepository } from '../uml-relationship-common-repository';

export const Reconnectable = {
  /**
   * creates a StTartReconnectingAction
   * @param endpoint the endpoint which should be reconnected. This endpoint will be part of the new connection, the other one is replaced.
   * @param id relationship id / ids, if omitted -> take all relationships from selected state
   */
  startReconnecting:
    (endpoint: 'source' | 'target', id?: string | string[]): AsyncAction =>
    (dispatch, getState) => {
      const ids = id
        ? Array.isArray(id)
          ? id
          : [id]
        : getState()
            .selected.map((elementId) => dispatch(UMLRelationshipCommonRepository.getById(elementId)))
            // all relationships are reconnectable + its a static property, that's why it is enough to check for relationship
            .filter((element) => element !== null && UMLRelationship.isUMLRelationship(element))
            .map((element) => element!.id);
      if (!ids.length) {
        return;
      }

      dispatch<ReconnectStartAction>({
        type: ReconnectableActionTypes.START,
        payload: { ids, endpoint },
        undoable: true,
      });
    },

  reconnect:
    (target: IUMLElementPort): AsyncAction =>
    (dispatch, getState) => {
      const { reconnecting, elements } = getState();
      const connections = Object.keys(reconnecting)
        .map((id) => {
          const relationship = elements[id] as IUMLRelationship;
          const endpoint1: 'source' | 'target' = reconnecting[id];
          const endpoint2: 'source' | 'target' = endpoint1 === 'source' ? 'target' : 'source';
          const connection = {
            [endpoint1]: relationship[endpoint1],
            [endpoint2]: { ...relationship[endpoint2], ...target },
          };

          if (
            connection.source.element === connection.target.element &&
            connection.source.direction === connection.target.direction
          ) {
            return null;
          }
          return { id, ...connection } as { id: string } & Connection;
        })
        .filter(notEmpty);

      if (!connections.length) {
        return;
      }

      dispatch<ReconnectAction>({
        type: ReconnectableActionTypes.RECONNECT,
        payload: { connections },
        undoable: false,
      });
    },

  endReconnecting:
    (id?: string | string[]): AsyncAction =>
    (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : Object.keys(getState().reconnecting);
      if (!ids.length) {
        return;
      }

      dispatch<ReconnectEndAction>({
        type: ReconnectableActionTypes.END,
        payload: { ids },
        undoable: false,
      });
    },
};
