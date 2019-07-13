import { Reducer } from 'redux';
import { UMLElementState } from '../uml-element/uml-element-types';
import { ReconnectableActionTypes, ReconnectAction } from './reconnectable/reconnectable-types';
import { IUMLRelationship } from './uml-relationship';
import { UMLRelationshipActions, UMLRelationshipActionTypes } from './uml-relationship-types';

export const UMLRelationshipReducer: Reducer<UMLElementState, UMLRelationshipActions | ReconnectAction> = (
  state = {},
  action,
) => {
  switch (action.type) {
    case ReconnectableActionTypes.RECONNECT: {
      const { payload } = action;

      return payload.connections.reduce(
        (acc, connection) => ({
          ...acc,
          [connection.id]: {
            ...state[connection.id],
            source: { ...(state[connection.id] as IUMLRelationship).source, ...connection.source },
            target: { ...(state[connection.id] as IUMLRelationship).target, ...connection.target },
          },
        }),
        state,
      );
    }
    case UMLRelationshipActionTypes.LAYOUT: {
      const { payload } = action;

      return {
        ...state,
        [payload.id]: {
          ...state[payload.id],
          path: payload.path,
          bounds: {
            ...state[payload.id].bounds,
            ...payload.bounds,
          },
        },
      };
    }
  }
  return state;
};
