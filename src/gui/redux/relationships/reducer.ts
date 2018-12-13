import { ReduxAction } from "../actions";
import { State as ReduxState } from "./../../../components/Store";

type State = ReduxState["relationships"];

const initialState: State = {
    allIds: [],
    byId: {}
};

export default function relationshipsReducer(state = initialState, action: ReduxAction): State {
    switch (action.type) {
        case "CREATE_RELATIONSHIP":
            return {
                allIds: [...state.allIds, action.relationship.id],
                byId: {
                    ...state.byId,
                    [action.relationship.id]: action.relationship
                }
            };

        case "@@element/DELETE": {
            const deadRelationshipIds = new Set<string>();
            const allRelationships = state.allIds.map(id => state.byId[id]);

            for (const { id, source, target } of allRelationships) {
                if (source.entityId === action.element.id || target.entityId === action.element.id) {
                    deadRelationshipIds.add(id);
                    continue;
                }
            }

            if (deadRelationshipIds.size === 0) {
                return state;
            }

            const allIds = state.allIds.filter(id => !deadRelationshipIds.has(id));
            const byId = { ...state.byId };

            deadRelationshipIds.forEach(id => {
                delete byId[id];
            });

            return { allIds, byId };
        }

        case "FLIP_RELATIONSHIP": {
            const relationship = action.relationship;
            [relationship.source, relationship.target] = [relationship.target, relationship.source];
            return {
                ...state,
                byId: {
                    ...state.byId,
                    [relationship.id]: relationship
                }
            };
        }

        case "FLIP_RELATIONSHIPS": {
            const byId = { ...state.byId };
            for (const relationshipId of action.relationshipIds) {
                const rel = { ...byId[relationshipId] };
                [rel.source, rel.target] = [rel.target, rel.source];
                byId[relationshipId] = rel;
            }
            return { ...state, byId };
        }

        case "UPDATE_RELATIONSHIPS":
            return {
                ...state,
                byId: {
                    ...state.byId,
                    [action.relationship.id]: action.relationship
                }
            };

        default:
            return state;
    }
}
