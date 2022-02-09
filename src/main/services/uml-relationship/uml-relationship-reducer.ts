import { Reducer } from 'redux';
import { Actions } from '../actions.js';
import { UMLElementState } from '../uml-element/uml-element-types.js';
import { ReconnectableActionTypes } from './reconnectable/reconnectable-types.js';
import { IUMLRelationship } from './uml-relationship.js';
import { UMLRelationshipActionTypes } from './uml-relationship-types.js';

export const UMLRelationshipReducer: Reducer<UMLElementState, Actions> = (state = {}, action) => {
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
