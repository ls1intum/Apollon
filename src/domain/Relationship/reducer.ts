import { Reducer } from 'redux';
import { Actions, ActionTypes } from './types';
import { State } from '../Element/types';

const initialState: State = {};

const Reducer: Reducer<State, Actions> = (state = initialState, action) => {
  switch (action.type) {
    case ActionTypes.CREATE: {
      const { payload } = action;
      return {
        ...state,
        [payload.relationship.id]: {
          ...payload.relationship,
          bounds: payload.relationship.bounds,
        },
      };
    }
    case ActionTypes.REDRAW: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: {
          ...state[payload.id],
          path: payload.path,
          bounds: payload.bounds,
        },
      };
    }
    case ActionTypes.CONNECT: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: {
          ...state[payload.id],
          ...(payload.source && { source: payload.source }),
          ...(payload.target && { target: payload.target }),
        },
      };
    }
    default:
      return state;
  }
};

export default Reducer;

// export default function relationshipsReducer(
//   state = initialState,
//   action: Actions
// ): State {
//   switch (action.type) {
// case "CREATE_RELATIONSHIP":
//     return {
//         allIds: [...state.allIds, action.relationship.id],
//         byId: {
//             ...state.byId,
//             [action.relationship.id]: action.relationship
//         }
//     };

// case "@@element/DELETE": {
//     const deadRelationshipIds = new Set<string>();
//     const allRelationships = Object.state.map(id => state.byId[id]);

//     for (const { id, source, target } of allRelationships) {
//         if (source.entityId === action.payload.id || target.entityId === action.payload.id || id === action.payload.id) {
//             deadRelationshipIds.add(id);
//             continue;
//         }
//     }

//     if (deadRelationshipIds.size === 0) {
//         return state;
//     }

//     const allIds = state.allIds.filter(id => !deadRelationshipIds.has(id));
//     const byId = { ...state.byId };

//     deadRelationshipIds.forEach(id => {
//         delete byId[id];
//     });

//     return { allIds, byId };
// }

// case "FLIP_RELATIONSHIP": {
//     const relationship = action.relationship;
//     [relationship.source, relationship.target] = [relationship.target, relationship.source];
//     return {
//         ...state,
//         byId: {
//             ...state.byId,
//             [relationship.id]: relationship
//         }
//     };
// }

// case "FLIP_RELATIONSHIPS": {
//     const byId = { ...state.byId };
//     for (const relationshipId of action.relationshipIds) {
//         const rel = { ...byId[relationshipId] };
//         [rel.source, rel.target] = [rel.target, rel.source];
//         byId[relationshipId] = rel;
//     }
//     return { ...state, byId };
// }

// case "UPDATE_RELATIONSHIPS":
//     return {
//         ...state,
//         byId: {
//             ...state.byId,
//             [action.relationship.id]: action.relationship
//         }
//     };

//     default:
//       return state;
//   }
// }
